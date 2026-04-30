import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import { setTimeout as sleep } from "node:timers/promises";

import { raiseError } from "../../lib/errors.js";
import type { AppVariables } from "../../types.js";
import {
  BulkIngestSmsRequestSchema,
} from "./job.schemas.js";

export async function bulkIngestSmsController(
  c: Context<{ Variables: AppVariables }>,
) {
  const body = await c.req.json();
  const input = BulkIngestSmsRequestSchema.parse(body);
  const service = c.get("jobService");
  const result = await service.createBulkSmsBatch(input);
  return c.json(result, 202);
}

export async function getBatchStatusController(
  c: Context<{ Variables: AppVariables }>,
) {
  const service = c.get("jobService");
  const batchId = c.req.param("batchId");
  const userId = c.req.query("userId");

  if (!batchId) {
    throw raiseError("COMMON_INVALID_REQUEST", {
      component: "job-controller",
      operation: "get_batch_status",
      details: [
        {
          field: "batchId",
          location: "params",
          message: "Required",
        },
      ],
    });
  }

  if (!userId) {
    throw raiseError("COMMON_INVALID_REQUEST", {
      component: "job-controller",
      operation: "get_batch_status",
      details: [
        {
          field: "userId",
          location: "query",
          message: "Required",
        },
      ],
    });
  }

  const result = await service.getBatchStatus(batchId, userId);
  return c.json(result, 200);
}

export async function getBatchResultsController(
  c: Context<{ Variables: AppVariables }>,
) {
  const service = c.get("jobService");
  const batchId = c.req.param("batchId");
  const userId = c.req.query("userId");

  if (!batchId) {
    throw raiseError("COMMON_INVALID_REQUEST", {
      component: "job-controller",
      operation: "get_batch_results",
      details: [
        {
          field: "batchId",
          location: "params",
          message: "Required",
        },
      ],
    });
  }

  if (!userId) {
    throw raiseError("COMMON_INVALID_REQUEST", {
      component: "job-controller",
      operation: "get_batch_results",
      details: [
        {
          field: "userId",
          location: "query",
          message: "Required",
        },
      ],
    });
  }

  const result = await service.getBatchResults(batchId, userId);
  return c.json(result, 200);
}

export async function streamBatchStatusController(
  c: Context<{ Variables: AppVariables }>,
) {
  const service = c.get("jobService");
  const batchId = c.req.param("batchId");
  const userId = c.req.query("userId");

  if (!batchId) {
    throw raiseError("COMMON_INVALID_REQUEST", {
      component: "job-controller",
      operation: "stream_batch_status",
      details: [{ field: "batchId", location: "params", message: "Required" }],
    });
  }

  if (!userId) {
    throw raiseError("COMMON_INVALID_REQUEST", {
      component: "job-controller",
      operation: "stream_batch_status",
      details: [{ field: "userId", location: "query", message: "Required" }],
    });
  }

  return streamSSE(c, async (stream) => {
    let previousSnapshot = "";

    while (true) {
      const status = await service.getBatchStatus(batchId, userId);
      const progress =
        status.totalJobs > 0
          ? Math.round(((status.completedJobs + status.failedJobs) / status.totalJobs) * 100)
          : 0;
      const payload = {
        ...status,
        progress,
      };
      const serialized = JSON.stringify(payload);

      if (serialized !== previousSnapshot) {
        const event =
          status.status === "completed" || status.status === "partially_completed"
            ? "job.completed"
            : status.status === "failed" || status.status === "cancelled"
              ? "job.failed"
              : status.status === "processing"
                ? "job.progress"
                : "job.queued";

        await stream.writeSSE({
          event,
          data: serialized,
          id: status.updatedAt,
        });
        previousSnapshot = serialized;
      }

      if (
        status.status === "completed" ||
        status.status === "partially_completed" ||
        status.status === "failed" ||
        status.status === "cancelled"
      ) {
        break;
      }

      if (stream.aborted) {
        break;
      }

      await sleep(2_000);
    }
  });
}
