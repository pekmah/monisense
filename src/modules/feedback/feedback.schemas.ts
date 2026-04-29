import { z } from "@hono/zod-openapi";

export const FeedbackRequestSchema = z.object({
  userId: z.string().min(1).openapi({
    example: "user_123",
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
  finalCategory: z.string().min(1).openapi({
    example: "Groceries",
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
