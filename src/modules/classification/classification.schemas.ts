import { z } from "zod";

export const ClassificationRequestSchema = z.object({
  userId: z.string().min(1),
  transaction: z.object({
    transactionType: z.string().min(1),
    amount: z.number().nullable(),
    merchantName: z.string().nullable(),
    cleanDescription: z.string().min(1),
  }),
  existingCategories: z.array(z.string().min(1)).default([]),
});

export const ClassificationResponseSchema = z.object({
  suggestedCategory: z.string().nullable(),
  confidence: z.number().nullable(),
  reason: z.string().nullable(),
  needsReview: z.boolean(),
  source: z.enum(["merchant_memory", "gemma", "none"]),
  categoryProposal: z
    .object({
      id: z.string(),
      proposedName: z.string(),
      status: z.string(),
    })
    .nullable(),
});

export type ClassificationRequest = z.infer<typeof ClassificationRequestSchema>;
export type ClassificationResponse = z.infer<typeof ClassificationResponseSchema>;
