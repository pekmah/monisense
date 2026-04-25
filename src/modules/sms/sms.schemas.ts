import { z } from "zod";

export const ParsedSmsTransactionSchema = z.object({
  provider: z.enum(["mpesa", "bank", "unknown"]),
  transactionType: z.enum(["income", "expense", "transfer", "reversal", "unknown"]),
  amount: z.number().nullable(),
  currency: z.literal("KES"),
  merchantName: z.string().nullable(),
  counterpartyPhone: z.string().nullable(),
  reference: z.string().nullable(),
  transactionDate: z.string().nullable(),
  cleanDescription: z.string(),
  removedBalanceText: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export type ParsedSmsTransaction = z.infer<typeof ParsedSmsTransactionSchema>;

export const ParseSmsRequestSchema = z.object({
  userId: z.string().min(1),
  message: z.string().min(1).max(4000),
});

export const ParseSmsResponseSchema = ParsedSmsTransactionSchema;
