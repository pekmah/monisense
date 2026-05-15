import { and, eq } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { classificationExamples, userFeedback } from "../../db/schema.js";
import { MerchantMemoryService } from "../merchants/merchant-memory.service.js";
import { normalizeMerchantKey } from "../merchants/merchant-normalizer.js";

export class FeedbackService {
  private readonly merchantMemoryService: MerchantMemoryService;

  constructor(private readonly db: Db) {
    this.merchantMemoryService = new MerchantMemoryService(db);
  }

  async record(input: {
    aiConfidence?: number | null;
    userId: string;
    clientFeedbackId?: string | null;
    entityType?: "sms_candidate" | "transaction" | "bill_payment" | null;
    entityId?: string | null;
    merchantName: string | null;
    merchantKey: string | null;
    amountMinor?: number | null;
    direction?: "expense" | "income" | null;
    oldCategory?: string | null;
    oldCategoryId?: string | null;
    finalCategoryId?: string | null;
    aiSuggestedCategory: string | null;
    classificationSource?: string | null;
    correctionType?: "confirmed" | "corrected" | "manual_teach" | "dismissed";
    finalCategory: string;
    wasAiCorrect: boolean;
  }) {
    if (input.clientFeedbackId) {
      const existing = await this.db.query.userFeedback.findFirst({
        where: and(
          eq(userFeedback.userId, input.userId),
          eq(userFeedback.clientFeedbackId, input.clientFeedbackId),
        ),
      });
      if (existing) {
        return;
      }
    }

    const merchantKey = input.merchantKey ?? normalizeMerchantKey(input.merchantName);
    const correctionType = input.correctionType ?? (input.wasAiCorrect ? "confirmed" : "corrected");
    const [feedback] = await this.db.insert(userFeedback).values({
      clientFeedbackId: input.clientFeedbackId ?? null,
      userId: input.userId,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      merchantName: input.merchantName,
      merchantKey,
      amountMinor: input.amountMinor ?? null,
      direction: input.direction ?? null,
      oldCategoryId: input.oldCategoryId ?? null,
      oldCategory: input.oldCategory ?? null,
      finalCategoryId: input.finalCategoryId ?? null,
      aiSuggestedCategory: input.aiSuggestedCategory,
      aiConfidence: input.aiConfidence ?? null,
      classificationSource: input.classificationSource ?? null,
      correctionType,
      finalCategory: input.finalCategory,
      wasAiCorrect: input.wasAiCorrect,
    }).returning();

    if (merchantKey) {
      await this.merchantMemoryService.remember({
        userId: input.userId,
        merchantKey,
        merchantDisplayName: input.merchantName ?? merchantKey,
        categoryName: input.finalCategory,
        confidence: correctionType === "corrected" || correctionType === "manual_teach"
          ? 0.98
          : 0.94,
        source: "user_feedback",
      });

      await this.db.insert(classificationExamples).values({
        userId: input.userId,
        merchantKey,
        merchantDisplayName: input.merchantName ?? merchantKey,
        cleanDescription: input.merchantName ?? null,
        amountBand: getAmountBand(input.amountMinor),
        direction: input.direction ?? null,
        finalCategory: input.finalCategory,
        rejectedCategory: input.wasAiCorrect ? null : input.aiSuggestedCategory ?? input.oldCategory ?? null,
        sourceFeedbackId: feedback.id,
        weight: getExampleWeight(correctionType),
      });
    }
  }
}

function getAmountBand(amountMinor: number | null | undefined) {
  if (!amountMinor || amountMinor <= 0) {
    return null;
  }
  if (amountMinor < 1_000) return "under_10";
  if (amountMinor < 10_000) return "10_to_100";
  if (amountMinor < 100_000) return "100_to_1000";
  if (amountMinor < 1_000_000) return "1000_to_10000";
  return "over_10000";
}

function getExampleWeight(correctionType: "confirmed" | "corrected" | "manual_teach" | "dismissed") {
  if (correctionType === "corrected") return 120;
  if (correctionType === "manual_teach") return 100;
  if (correctionType === "confirmed") return 80;
  return 20;
}
