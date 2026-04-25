import type { Db } from "../../db/client.js";
import { userFeedback } from "../../db/schema.js";
import { MerchantMemoryService } from "../merchants/merchant-memory.service.js";

export class FeedbackService {
  private readonly merchantMemoryService: MerchantMemoryService;

  constructor(private readonly db: Db) {
    this.merchantMemoryService = new MerchantMemoryService(db);
  }

  async record(input: {
    userId: string;
    merchantName: string | null;
    merchantKey: string | null;
    aiSuggestedCategory: string | null;
    finalCategory: string;
    wasAiCorrect: boolean;
  }) {
    await this.db.insert(userFeedback).values({
      userId: input.userId,
      merchantKey: input.merchantKey,
      aiSuggestedCategory: input.aiSuggestedCategory,
      finalCategory: input.finalCategory,
      wasAiCorrect: input.wasAiCorrect,
    });

    if (input.merchantKey) {
      await this.merchantMemoryService.remember({
        userId: input.userId,
        merchantKey: input.merchantKey,
        merchantDisplayName: input.merchantName ?? input.merchantKey,
        categoryName: input.finalCategory,
        confidence: input.wasAiCorrect ? 0.98 : 0.9,
        source: "user_feedback",
      });
    }
  }
}
