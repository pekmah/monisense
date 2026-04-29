import { z } from "@hono/zod-openapi";

export const ParsedSmsTransactionSchema = z.object({
  provider: z.enum(["mpesa", "bank", "unknown"]).openapi({
    example: "mpesa",
  }),
  transactionType: z
    .enum(["income", "expense", "transfer", "reversal", "unknown"])
    .openapi({
      example: "expense",
    }),
  amount: z.number().nullable().openapi({
    example: 250,
  }),
  currency: z.literal("KES").openapi({
    example: "KES",
  }),
  merchantName: z.string().nullable().openapi({
    example: "NAIVAS",
  }),
  counterpartyPhone: z.string().nullable().openapi({
    example: null,
  }),
  reference: z.string().nullable().openapi({
    example: null,
  }),
  transactionDate: z.string().nullable().openapi({
    example: null,
  }),
  cleanDescription: z.string().openapi({
    example: "Payment to NAIVAS",
  }),
  removedBalanceText: z.string().nullable().openapi({
    example: "New M-PESA balance is Ksh1,200.",
  }),
  confidence: z.number().min(0).max(1).openapi({
    example: 0.85,
  }),
});

export type ParsedSmsTransaction = z.infer<typeof ParsedSmsTransactionSchema>;

export const ParseSmsRequestSchema = z.object({
  userId: z.string().min(1).openapi({
    example: "user_123",
  }),
  message: z.string().min(1).max(4000).openapi({
    example: "Confirmed. Ksh250 paid to NAIVAS. New M-PESA balance is Ksh1,200.",
  }),
});

export const ParseSmsResponseSchema = ParsedSmsTransactionSchema;
