import { and, desc, eq, sql } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { merchantMemory } from "../../db/schema.js";

export type MerchantMemoryHit = {
  merchantKey: string;
  merchantDisplayName: string;
  categoryName: string;
  confidence: number;
  source: string;
  usageCount: number;
};

export class MerchantMemoryService {
  constructor(private readonly db: Db) {}

  async find(userId: string, merchantKey: string): Promise<MerchantMemoryHit | null> {
    const row = await this.db.query.merchantMemory.findFirst({
      where: and(
        eq(merchantMemory.userId, userId),
        eq(merchantMemory.merchantKey, merchantKey),
      ),
      orderBy: [desc(merchantMemory.updatedAt)],
    });

    if (!row) return null;

    return {
      merchantKey: row.merchantKey,
      merchantDisplayName: row.merchantDisplayName,
      categoryName: row.categoryName,
      confidence: row.confidence / 1000,
      source: row.source,
      usageCount: row.usageCount,
    };
  }

  async remember(input: {
    userId: string;
    merchantKey: string;
    merchantDisplayName: string;
    categoryName: string;
    confidence: number;
    source: "user_feedback" | "ai_confirmed" | "manual";
  }) {
    const existing = await this.db.query.merchantMemory.findFirst({
      where: and(
        eq(merchantMemory.userId, input.userId),
        eq(merchantMemory.merchantKey, input.merchantKey),
      ),
    });

    if (!existing) {
      await this.db.insert(merchantMemory).values({
        userId: input.userId,
        merchantKey: input.merchantKey,
        merchantDisplayName: input.merchantDisplayName,
        categoryName: input.categoryName,
        confidence: Math.round(input.confidence * 1000),
        source: input.source,
      });
      return;
    }

    await this.db
      .update(merchantMemory)
      .set({
        merchantDisplayName: input.merchantDisplayName,
        categoryName: input.categoryName,
        confidence: Math.round(input.confidence * 1000),
        source: input.source,
        usageCount: sql`${merchantMemory.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(merchantMemory.id, existing.id));
  }
}
