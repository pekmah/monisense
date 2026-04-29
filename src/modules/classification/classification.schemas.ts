import { z } from "@hono/zod-openapi";

export const ClassificationRequestSchema = z.object({
  userId: z.string().min(1).openapi({
    example: "user_123",
  }),
  transaction: z.object({
    transactionType: z.string().min(1).openapi({
      example: "expense",
    }),
    amount: z.number().nullable().openapi({
      example: 250,
    }),
    merchantName: z.string().nullable().openapi({
      example: "NAIVAS",
    }),
    cleanDescription: z.string().min(1).openapi({
      example: "Payment to NAIVAS",
    }),
  }),
  existingCategories: z.array(z.string().min(1)).default([]).openapi({
    example: [
      "Groceries",
      "Transport",
      "Rent",
      "Utilities",
      "Airtime",
      "Entertainment",
    ],
  }),
});

export const ClassificationResponseSchema = z.object({
  suggestedCategory: z.string().nullable().openapi({
    example: "Groceries",
  }),
  confidence: z.number().nullable().openapi({
    example: 0.86,
  }),
  reason: z.string().nullable().openapi({
    example: "Merchant appears to be a supermarket",
  }),
  needsReview: z.boolean().openapi({
    example: false,
  }),
  source: z.enum(["merchant_memory", "gemma", "none"]).openapi({
    example: "gemma",
  }),
  categoryProposal: z
    .object({
      id: z.string().openapi({
        example: "d4e3a895-ab5a-445d-b330-37f0ef5de63d",
      }),
      proposedName: z.string().openapi({
        example: "Uncategorized",
      }),
      status: z.string().openapi({
        example: "pending",
      }),
    })
    .nullable(),
});

export type ClassificationRequest = z.infer<typeof ClassificationRequestSchema>;
export type ClassificationResponse = z.infer<typeof ClassificationResponseSchema>;
