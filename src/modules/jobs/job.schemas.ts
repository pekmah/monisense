import { z } from "@hono/zod-openapi";

import { ClassificationResponseSchema } from "../classification/classification.schemas.js";
import { ParsedSmsTransactionSchema } from "../sms/sms.schemas.js";

export const BulkIngestSmsRequestSchema = z.object({
  userId: z.string().min(1).openapi({
    example: "user_123",
  }),
  clientBatchId: z.string().min(1).max(128).optional().openapi({
    example: "import_2026_04_30_a",
  }),
  existingCategories: z.array(z.string().min(1)).default([]).openapi({
    example: ["Groceries", "Transport", "Rent", "Utilities", "Airtime", "Entertainment"],
  }),
  messages: z.array(z.string().min(1).max(4000)).min(1).max(500).openapi({
    example: [
      "Confirmed. Ksh250 paid to NAIVAS. New M-PESA balance is Ksh1,200.",
      "Confirmed. Ksh790 paid to CARREFOUR XYZ 9384. M-PESA balance is Ksh410.",
    ],
  }),
});

export const BatchStatusSchema = z.object({
  batchId: z.string().uuid().openapi({
    example: "8abf3216-4c65-4560-bdbb-83231be2d4fb",
  }),
  status: z
    .enum(["queued", "processing", "completed", "failed", "partially_completed", "cancelled"])
    .openapi({
      example: "processing",
    }),
  totalJobs: z.number().int().openapi({
    example: 180,
  }),
  completedJobs: z.number().int().openapi({
    example: 96,
  }),
  failedJobs: z.number().int().openapi({
    example: 3,
  }),
  createdAt: z.string().datetime().openapi({
    example: "2026-04-30T10:00:00.000Z",
  }),
  updatedAt: z.string().datetime().openapi({
    example: "2026-04-30T10:01:30.000Z",
  }),
});

export const BulkIngestSmsResponseSchema = BatchStatusSchema;

export const BatchJobResultSchema = z.object({
  jobId: z.string().uuid().openapi({
    example: "0f88928f-88cf-4f66-b7a7-edc92da8bc4c",
  }),
  status: z
    .enum(["queued", "processing", "completed", "failed", "retryable_failed", "cancelled"])
    .openapi({
      example: "completed",
    }),
  rawSmsHash: z.string().openapi({
    example: "5b9220ef679d6d72e09e8c5387e10082c9e5bf0f8140e7755595f5bd80b8fcb2",
  }),
  attemptCount: z.number().int().openapi({
    example: 1,
  }),
  errorCode: z.string().nullable().openapi({
    example: null,
  }),
  errorMessage: z.string().nullable().openapi({
    example: null,
  }),
  parsedTransaction: ParsedSmsTransactionSchema.nullable(),
  classification: ClassificationResponseSchema.nullable(),
  createdAt: z.string().datetime().openapi({
    example: "2026-04-30T10:00:00.000Z",
  }),
  updatedAt: z.string().datetime().openapi({
    example: "2026-04-30T10:00:10.000Z",
  }),
});

export const BatchResultsResponseSchema = z.object({
  batchId: z.string().uuid().openapi({
    example: "8abf3216-4c65-4560-bdbb-83231be2d4fb",
  }),
  status: BatchStatusSchema.shape.status,
  totalJobs: z.number().int().openapi({
    example: 180,
  }),
  completedJobs: z.number().int().openapi({
    example: 96,
  }),
  failedJobs: z.number().int().openapi({
    example: 3,
  }),
  results: z.array(BatchJobResultSchema),
});

export type BulkIngestSmsRequest = z.infer<typeof BulkIngestSmsRequestSchema>;
export type BatchStatusResponse = z.infer<typeof BatchStatusSchema>;
export type BatchResultsResponse = z.infer<typeof BatchResultsResponseSchema>;
