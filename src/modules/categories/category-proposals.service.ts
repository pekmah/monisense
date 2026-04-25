import { and, eq } from "drizzle-orm";

import type { Db } from "../../db/client.js";
import { categoryProposals } from "../../db/schema.js";
import { normalizeCategoryName } from "./category-governor.service.js";

export class CategoryProposalsService {
  constructor(private readonly db: Db) {}

  async ensurePendingProposal(input: {
    userId: string;
    proposedName: string;
    reason: string | null;
  }) {
    const normalizedName = normalizeCategoryName(input.proposedName);
    const existing = await this.db.query.categoryProposals.findFirst({
      where: and(
        eq(categoryProposals.userId, input.userId),
        eq(categoryProposals.normalizedName, normalizedName),
      ),
    });

    if (existing) {
      return existing;
    }

    const [proposal] = await this.db
      .insert(categoryProposals)
      .values({
        userId: input.userId,
        proposedName: input.proposedName.trim(),
        normalizedName,
        reason: input.reason,
      })
      .returning();

    return proposal;
  }
}
