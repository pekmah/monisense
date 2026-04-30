import { createHash, randomUUID } from "node:crypto";

import { and, asc, eq, inArray, lte, or } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { classificationJobs, jobBatches } from "../../db/schema.js";
import { AppError } from "../../lib/app-error.js";
import { raiseError } from "../../lib/errors.js";
import type { Logger } from "../../lib/logger.js";
import type { ClassificationService } from "../classification/classification.service.js";
import { parseSmsTransaction } from "../sms/sms-parser.js";
import type {
  BatchResultsResponse,
  BatchStatusResponse,
  BulkIngestSmsRequest,
} from "./job.schemas.js";

type JobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "retryable_failed"
  | "cancelled";

type BatchStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "partially_completed"
  | "cancelled";

const RETRYABLE_JOB_STATUSES: JobStatus[] = ["queued", "retryable_failed"];

function hashSms(message: string) {
  return createHash("sha256").update(message).digest("hex");
}

function toIsoString(value: Date) {
  return value.toISOString();
}

function computeBackoffMs(attemptCount: number) {
  if (attemptCount <= 1) return 30_000;
  if (attemptCount === 2) return 120_000;
  return 600_000;
}

export class JobService {
  constructor(
    private readonly db: Db,
    private readonly classificationService: ClassificationService,
  ) {}

  async createBulkSmsBatch(input: BulkIngestSmsRequest): Promise<BatchStatusResponse> {
    if (input.clientBatchId) {
      const existing = await this.db.query.jobBatches.findFirst({
        where: and(
          eq(jobBatches.userId, input.userId),
          eq(jobBatches.clientBatchId, input.clientBatchId),
        ),
      });

      if (existing) {
        return this.getBatchStatus(existing.id, input.userId);
      }
    }

    const dedupedMessages = Array.from(
      new Map<string, string>(
        input.messages
          .map((message: string) => message.trim())
          .filter((message: string) => message.length > 0)
          .map((message: string) => [hashSms(message), message]),
      ).entries(),
    );

    if (dedupedMessages.length === 0) {
      throw raiseError("COMMON_INVALID_REQUEST", {
        component: "job-service",
        operation: "create_bulk_sms_batch",
        details: [
          {
            field: "messages",
            location: "body",
            message: "At least one non-empty SMS message is required.",
          },
        ],
      });
    }

    const [batch] = await this.db
      .insert(jobBatches)
      .values({
        userId: input.userId,
        clientBatchId: input.clientBatchId,
        existingCategories: input.existingCategories,
        totalJobs: dedupedMessages.length,
      })
      .returning();

    await this.db.insert(classificationJobs).values(
      dedupedMessages.map(([rawSmsHash, rawSms]) => ({
        batchId: batch.id,
        userId: input.userId,
        rawSms,
        rawSmsHash,
      })),
    );

    return this.getBatchStatus(batch.id, input.userId);
  }

  async getBatchStatus(batchId: string, userId: string): Promise<BatchStatusResponse> {
    const batch = await this.requireBatch(batchId, userId);

    return {
      batchId: batch.id,
      status: batch.status as BatchStatus,
      totalJobs: batch.totalJobs,
      completedJobs: batch.completedJobs,
      failedJobs: batch.failedJobs,
      createdAt: toIsoString(batch.createdAt),
      updatedAt: toIsoString(batch.updatedAt),
    };
  }

  async getBatchResults(batchId: string, userId: string): Promise<BatchResultsResponse> {
    const batch = await this.requireBatch(batchId, userId);
    const jobs = await this.db.query.classificationJobs.findMany({
      where: eq(classificationJobs.batchId, batch.id),
      orderBy: [asc(classificationJobs.createdAt)],
    });

    return {
      batchId: batch.id,
      status: batch.status as BatchStatus,
      totalJobs: batch.totalJobs,
      completedJobs: batch.completedJobs,
      failedJobs: batch.failedJobs,
      results: jobs.map((job) => {
        const resultJson =
          job.resultJson && typeof job.resultJson === "object"
            ? (job.resultJson as {
                parsedTransaction?: unknown;
                classification?: unknown;
              })
            : null;

        return {
          jobId: job.id,
          status: job.status as JobStatus,
          rawSmsHash: job.rawSmsHash,
          attemptCount: job.attemptCount,
          errorCode: job.errorCode,
          errorMessage: job.errorMessage,
          parsedTransaction: (resultJson?.parsedTransaction ??
            job.parsedJson ??
            null) as BatchResultsResponse["results"][number]["parsedTransaction"],
          classification: (resultJson?.classification ??
            null) as BatchResultsResponse["results"][number]["classification"],
          createdAt: toIsoString(job.createdAt),
          updatedAt: toIsoString(job.updatedAt),
        };
      }),
    };
  }

  async claimJobs(limit: number, workerId: string = randomUUID()) {
    const jobs = await this.db.query.classificationJobs.findMany({
      where: and(
        or(
          eq(classificationJobs.status, "queued"),
          eq(classificationJobs.status, "retryable_failed"),
        ),
        lte(classificationJobs.runAfter, new Date()),
      ),
      orderBy: [asc(classificationJobs.createdAt)],
      limit,
    });

    if (jobs.length === 0) return [];

    const claimedAt = new Date();
    const claimedIds: string[] = [];

    for (const job of jobs) {
      await this.db
        .update(classificationJobs)
        .set({
          status: "processing",
          lockedAt: claimedAt,
          lockedBy: workerId,
          attemptCount: job.attemptCount + 1,
          updatedAt: claimedAt,
        })
        .where(eq(classificationJobs.id, job.id));
      claimedIds.push(job.id);
    }

    const claimedJobs = await this.db.query.classificationJobs.findMany({
      where: inArray(classificationJobs.id, claimedIds),
      orderBy: [asc(classificationJobs.createdAt)],
    });

    const batchIds = Array.from(new Set(claimedJobs.map((job) => job.batchId)));
    if (batchIds.length > 0) {
      await this.db
        .update(jobBatches)
        .set({
          status: "processing",
          updatedAt: new Date(),
        })
        .where(inArray(jobBatches.id, batchIds));
    }
    const batches = await this.db.query.jobBatches.findMany({
      where: inArray(jobBatches.id, batchIds),
    });
    const batchById = new Map(batches.map((batch) => [batch.id, batch]));

    return claimedJobs.map((job) => {
      const batch = batchById.get(job.batchId);
      if (!batch) {
        throw raiseError("COMMON_INTERNAL", {
          component: "job-service",
          operation: "claim_jobs",
          metadata: { jobId: job.id, batchId: job.batchId },
        });
      }
      return { job, batch };
    });
  }

  async processClaimedJob(
    claimed: Awaited<ReturnType<JobService["claimJobs"]>>[number],
    log: Logger,
  ) {
    const { job, batch } = claimed;
    try {
      const parsed = parseSmsTransaction(job.rawSms);
      const classification = await this.classificationService.classify(
        {
          userId: job.userId,
          rawSms: job.rawSms,
          transaction: {
            transactionType: parsed.transactionType,
            amount: parsed.amount,
            merchantName: parsed.merchantName,
            cleanDescription: parsed.cleanDescription,
          },
          existingCategories: batch.existingCategories,
        },
        log,
      );

      await this.db
        .update(classificationJobs)
        .set({
          status: "completed",
          parsedJson: parsed,
          resultJson: {
            parsedTransaction: parsed,
            classification,
          },
          errorCode: null,
          errorMessage: null,
          lockedAt: null,
          lockedBy: null,
          updatedAt: new Date(),
        })
        .where(eq(classificationJobs.id, job.id));
    } catch (error) {
      log.error("job_processing_failed", {
        err: error,
        jobId: job.id,
        batchId: batch.id,
      });

      const appError =
        error instanceof AppError
          ? error
          : raiseError("COMMON_INTERNAL", {
              component: "job-service",
              operation: "process_claimed_job",
              cause: error,
            });
      const retryable = appError.status >= 500 && job.attemptCount < job.maxAttempts;

      await this.db
        .update(classificationJobs)
        .set({
          status: retryable ? "retryable_failed" : "failed",
          errorCode: appError.code,
          errorMessage: appError.message,
          lockedAt: null,
          lockedBy: null,
          runAfter: retryable
            ? new Date(Date.now() + computeBackoffMs(job.attemptCount))
            : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(classificationJobs.id, job.id));
    }

    await this.syncBatchProgress(batch.id);
  }

  async syncBatchProgress(batchId: string) {
    const jobs = await this.db.query.classificationJobs.findMany({
      where: eq(classificationJobs.batchId, batchId),
    });

    const totalJobs = jobs.length;
    const completedJobs = jobs.filter((job) => job.status === "completed").length;
    const failedJobs = jobs.filter(
      (job) => job.status === "failed" || job.status === "cancelled",
    ).length;
    const processingJobs = jobs.filter((job) => job.status === "processing").length;
    const retryableJobs = jobs.filter((job) =>
      RETRYABLE_JOB_STATUSES.includes(job.status as JobStatus),
    ).length;

    let status: BatchStatus = "queued";
    if (processingJobs > 0) status = "processing";
    else if (completedJobs === totalJobs && totalJobs > 0) status = "completed";
    else if (completedJobs > 0 && failedJobs > 0 && completedJobs + failedJobs === totalJobs) {
      status = "partially_completed";
    } else if (failedJobs === totalJobs && totalJobs > 0) {
      status = "failed";
    } else if (completedJobs > 0 || failedJobs > 0 || retryableJobs < totalJobs) {
      status = "processing";
    }

    await this.db
      .update(jobBatches)
      .set({
        status,
        totalJobs,
        completedJobs,
        failedJobs,
        updatedAt: new Date(),
      })
      .where(eq(jobBatches.id, batchId));
  }

  private async requireBatch(batchId: string, userId: string) {
    const batch = await this.db.query.jobBatches.findFirst({
      where: and(eq(jobBatches.id, batchId), eq(jobBatches.userId, userId)),
    });

    if (!batch) {
      throw raiseError("COMMON_NOT_FOUND", {
        component: "job-service",
        operation: "require_batch",
        message: "Queued batch was not found.",
        metadata: { batchId, userId },
      });
    }

    return batch;
  }
}
