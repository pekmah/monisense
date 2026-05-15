import { desc, eq } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { classificationExamples } from "../../db/schema.js";

export type LearnedClassificationExample = {
  amountBand: string | null;
  direction: string | null;
  finalCategory: string;
  merchantDisplayName: string;
  merchantKey: string;
  rejectedCategory: string | null;
  weight: number;
};

export class LearningExamplesService {
  constructor(private readonly db: Db) {}

  async findRelevant(input: {
    userId: string;
    merchantKey: string | null;
    limit?: number;
  }): Promise<LearnedClassificationExample[]> {
    if (!input.merchantKey) {
      return [];
    }

    const tokens = input.merchantKey
      .split(/\s+/)
      .filter((token) => token.length >= 4)
      .slice(0, 3);

    const rows = await this.db.query.classificationExamples.findMany({
      where: eq(classificationExamples.userId, input.userId),
      orderBy: [desc(classificationExamples.weight), desc(classificationExamples.createdAt)],
      limit: 50,
    });

    return rows
      .filter((row) => {
        if (row.userId !== input.userId) return false;
        if (row.merchantKey === input.merchantKey) return true;
        return tokens.some((token) => row.merchantKey.includes(token));
      })
      .slice(0, input.limit ?? 6)
      .map((row) => ({
        amountBand: row.amountBand,
        direction: row.direction,
        finalCategory: row.finalCategory,
        merchantDisplayName: row.merchantDisplayName,
        merchantKey: row.merchantKey,
        rejectedCategory: row.rejectedCategory,
        weight: row.weight,
      }));
  }
}
