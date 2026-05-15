import { z } from "@hono/zod-openapi";

export const FeedbackRequestSchema = z.object({
  clientFeedbackId: z.string().min(1).nullable().optional().openapi({
    example: "ai-feedback_123",
  }),
  userId: z.string().min(1).openapi({
    example: "user_123",
  }),
  entityType: z.enum(["sms_candidate", "transaction", "bill_payment"]).nullable().optional().openapi({
    example: "transaction",
  }),
  entityId: z.string().min(1).nullable().optional().openapi({
    example: "txn_123",
  }),
  merchantName: z.string().nullable().openapi({
    example: "NAIVAS",
  }),
  merchantKey: z.string().nullable().openapi({
    example: "naivas",
  }),
  aiSuggestedCategory: z.string().nullable().openapi({
    example: "Groceries",
  }),
  aiConfidence: z.number().nullable().optional().openapi({
    example: 92,
  }),
  amountMinor: z.number().int().nullable().optional().openapi({
    example: 25000,
  }),
  classificationSource: z.string().nullable().optional().openapi({
    example: "ai",
  }),
  correctionType: z
    .enum(["confirmed", "corrected", "manual_teach", "dismissed"])
    .default("corrected")
    .openapi({
      example: "corrected",
    }),
  direction: z.enum(["expense", "income"]).nullable().optional().openapi({
    example: "expense",
  }),
  finalCategoryId: z.string().nullable().optional().openapi({
    example: "cat-food",
  }),
  finalCategory: z.string().min(1).openapi({
    example: "Groceries",
  }),
  oldCategory: z.string().nullable().optional().openapi({
    example: "Shopping",
  }),
  oldCategoryId: z.string().nullable().optional().openapi({
    example: "cat-shopping",
  }),
  wasAiCorrect: z.boolean().openapi({
    example: true,
  }),
});

export const FeedbackResponseSchema = z.object({
  success: z.boolean().openapi({
    example: true,
  }),
});
