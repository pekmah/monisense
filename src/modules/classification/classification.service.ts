import { createHash } from "node:crypto";

import type { Db } from "../../db/client.js";
import { classificationLogs } from "../../db/schema.js";
import { validateClassificationOutput } from "../ai/ai-output-validator.js";
import { GemmaClient } from "../ai/gemma-client.js";
import { CategoryGovernorService } from "../categories/category-governor.service.js";
import { CategoryProposalsService } from "../categories/category-proposals.service.js";
import type { Logger } from "../../lib/logger.js";
import { buildClassificationPrompt } from "./classification.prompt.js";
import type { ClassificationRequest, ClassificationResponse } from "./classification.schemas.js";
import { LearningExamplesService } from "./learning-examples.service.js";
import { MerchantMemoryService } from "../merchants/merchant-memory.service.js";
import { normalizeMerchantKey } from "../merchants/merchant-normalizer.js";

export class ClassificationService {
  private readonly merchantMemoryService: MerchantMemoryService;
  private readonly categoryGovernor = new CategoryGovernorService();
  private readonly categoryProposalsService: CategoryProposalsService;
  private readonly learningExamplesService: LearningExamplesService;

  constructor(
    private readonly db: Db,
    private readonly gemmaClient: GemmaClient,
  ) {
    this.merchantMemoryService = new MerchantMemoryService(db);
    this.categoryProposalsService = new CategoryProposalsService(db);
    this.learningExamplesService = new LearningExamplesService(db);
  }

  async classify(
    input: ClassificationRequest & { rawSms?: string | null },
    log: Logger,
  ): Promise<ClassificationResponse> {
    const merchantKey = normalizeMerchantKey(input.transaction.merchantName);

    if (merchantKey) {
      const memory = await this.merchantMemoryService.find(input.userId, merchantKey);
      if (memory) {
        const response: ClassificationResponse = {
          suggestedCategory: memory.categoryName,
          confidence: memory.confidence,
          reason: `Reused saved category for ${memory.merchantDisplayName}.`,
          needsReview: memory.confidence < 0.85,
          source: "merchant_memory",
          categoryProposal: null,
        };

        await this.logClassification({
          userId: input.userId,
          rawSms: input.rawSms ?? input.transaction.cleanDescription,
          cleanDescription: input.transaction.cleanDescription,
          parsedJson: input.transaction,
          aiOutputJson: null,
          suggestedCategory: response.suggestedCategory,
          confidence: response.confidence,
          needsReview: response.needsReview,
          modelName: "merchant_memory",
          latencyMs: 0,
          status: "success",
        });

        return response;
      }
    }

    const learnedExamples = await this.learningExamplesService.findRelevant({
      userId: input.userId,
      merchantKey,
    });

    const prompt = buildClassificationPrompt({
      transactionType: input.transaction.transactionType,
      amount: input.transaction.amount,
      merchantName: input.transaction.merchantName,
      cleanDescription: input.transaction.cleanDescription,
      existingCategories: input.existingCategories,
      learnedExamples,
    });

    const inference = await this.gemmaClient.classify(prompt, log);

    let parsedOutput: unknown = null;
    try {
      parsedOutput = JSON.parse(inference.rawText);
    } catch {
      await this.logClassification({
        userId: input.userId,
        rawSms: input.rawSms ?? input.transaction.cleanDescription,
        cleanDescription: input.transaction.cleanDescription,
        parsedJson: input.transaction,
        aiOutputJson: {
          raw: inference.rawText,
        },
        suggestedCategory: null,
        confidence: null,
        needsReview: true,
        modelName: inference.modelName,
        latencyMs: inference.latencyMs,
        status: "malformed_output",
      });

      return {
        suggestedCategory: null,
        confidence: null,
        reason: null,
        needsReview: true,
        source: "gemma",
        categoryProposal: null,
      };
    }

    const validation = validateClassificationOutput(parsedOutput);
    if (!validation.success) {
      await this.logClassification({
        userId: input.userId,
        rawSms: input.rawSms ?? input.transaction.cleanDescription,
        cleanDescription: input.transaction.cleanDescription,
        parsedJson: input.transaction,
        aiOutputJson: parsedOutput,
        suggestedCategory: null,
        confidence: null,
        needsReview: true,
        modelName: inference.modelName,
        latencyMs: inference.latencyMs,
        status: "malformed_output",
      });

      return {
        suggestedCategory: null,
        confidence: null,
        reason: null,
        needsReview: true,
        source: "gemma",
        categoryProposal: null,
      };
    }

    const output = validation.data;
    const matchedCategory = this.categoryGovernor.matchExistingCategory(
      input.existingCategories,
      output.suggestedCategory,
    );

    let proposal: { id: string; proposedName: string; status: string } | null = null;
    const proposedCategoryName = output.proposedNewCategory ?? output.suggestedCategory;
    if (!matchedCategory && proposedCategoryName) {
      const created = await this.categoryProposalsService.ensurePendingProposal({
        userId: input.userId,
        proposedName: proposedCategoryName,
        reason: output.reason,
      });
      proposal = {
        id: created.id,
        proposedName: created.proposedName,
        status: created.status,
      };
    }

    const finalConfidence = output.confidence;
    const resolvedCategory =
      finalConfidence < 0.6 ? null : (matchedCategory ?? null);
    const needsReview = finalConfidence < 0.85 || !resolvedCategory;

    await this.logClassification({
      userId: input.userId,
      rawSms: input.rawSms ?? input.transaction.cleanDescription,
      cleanDescription: input.transaction.cleanDescription,
      parsedJson: input.transaction,
      aiOutputJson: output,
      suggestedCategory: resolvedCategory,
      confidence: finalConfidence,
      needsReview,
      modelName: inference.modelName,
      latencyMs: inference.latencyMs,
      status: "success",
    });

    if (merchantKey && resolvedCategory && !needsReview) {
      await this.merchantMemoryService.remember({
        userId: input.userId,
        merchantKey,
        merchantDisplayName: input.transaction.merchantName ?? merchantKey,
        categoryName: resolvedCategory,
        confidence: finalConfidence,
        source: "ai_confirmed",
      });
    }

    return {
      suggestedCategory: resolvedCategory,
      confidence: finalConfidence,
      reason: output.reason,
      needsReview,
      source: "gemma",
      categoryProposal: proposal,
    };
  }

  private async logClassification(input: {
    userId: string;
    rawSms: string;
    cleanDescription: string;
    parsedJson: unknown;
    aiOutputJson: unknown;
    suggestedCategory: string | null;
    confidence: number | null;
    needsReview: boolean;
    modelName: string;
    latencyMs: number;
    status: "success" | "failed" | "malformed_output";
  }) {
    await this.db.insert(classificationLogs).values({
      userId: input.userId,
      rawSmsHash: createHash("sha256").update(input.rawSms).digest("hex"),
      cleanDescription: input.cleanDescription,
      parsedJson: input.parsedJson,
      aiOutputJson: input.aiOutputJson,
      suggestedCategory: input.suggestedCategory,
      confidence: input.confidence === null ? null : Math.round(input.confidence * 1000),
      needsReview: input.needsReview,
      modelName: input.modelName,
      latencyMs: input.latencyMs,
      status: input.status,
    });
  }
}
