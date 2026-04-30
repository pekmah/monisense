import { createRoute, z } from "@hono/zod-openapi";

import { ClassificationRequestSchema, ClassificationResponseSchema } from "../modules/classification/classification.schemas.js";
import { FeedbackRequestSchema, FeedbackResponseSchema } from "../modules/feedback/feedback.schemas.js";
import {
  BatchResultsResponseSchema,
  BatchStatusSchema,
  BulkIngestSmsRequestSchema,
  BulkIngestSmsResponseSchema,
} from "../modules/jobs/job.schemas.js";
import { ParseSmsRequestSchema, ParseSmsResponseSchema } from "../modules/sms/sms.schemas.js";

export const ErrorDetailSchema = z
  .object({
    field: z.string().optional().openapi({
      example: "userId",
    }),
    location: z
      .enum(["body", "query", "params", "request", "system"])
      .optional()
      .openapi({
        example: "body",
      }),
    message: z.string().openapi({
      example: "Invalid input",
    }),
  })
  .openapi("ErrorDetail");

export const ErrorResponseSchema = z
  .object({
    error: z.object({
      code: z.string().openapi({
        example: "COMMON.INVALID_REQUEST",
      }),
      title: z.string().nullable().optional().openapi({
        example: "Invalid Request",
      }),
      message: z.string().openapi({
        example: "Invalid request payload.",
      }),
      details: z.array(ErrorDetailSchema).openapi({
        example: [
          {
            field: "userId",
            location: "body",
            message: "Required",
          },
        ],
      }),
      requestId: z.string().optional().openapi({
        example: "5cc1b877-a7ad-46b4-b8f4-6697e7323d94",
      }),
    }),
  })
  .openapi("ErrorResponse");

export const HealthResponseSchema = z
  .object({
    status: z.string().openapi({
      example: "ok",
    }),
    service: z.string().openapi({
      example: "monisense-ai-backend",
    }),
  })
  .openapi("HealthResponse");

export const ReadyResponseSchema = z
  .object({
    status: z.string().openapi({
      example: "ready",
    }),
  })
  .openapi("ReadyResponse");

export const ApiSecretHeaderSchema = z.object({
  "x-api-secret": z.string().min(1).openapi({
    example: "30dfa7bbafbf58d186808772e76935f434a623a390865fb4b98e274cf13f3da5",
  }),
});

const errorResponses = {
  400: {
    description: "Invalid request payload",
    content: {
      "application/json": {
        schema: ErrorResponseSchema,
      },
    },
  },
  401: {
    description: "Missing or invalid API secret",
    content: {
      "application/json": {
        schema: ErrorResponseSchema,
      },
    },
  },
  429: {
    description: "Rate limit exceeded",
    content: {
      "application/json": {
        schema: ErrorResponseSchema,
      },
    },
  },
  500: {
    description: "Internal server error",
    content: {
      "application/json": {
        schema: ErrorResponseSchema,
      },
    },
  },
  502: {
    description: "Gemma or upstream inference failure",
    content: {
      "application/json": {
        schema: ErrorResponseSchema,
      },
    },
  },
  404: {
    description: "Requested resource was not found",
    content: {
      "application/json": {
        schema: ErrorResponseSchema,
      },
    },
  },
} as const;

export const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Health check",
  description: "Returns process-level health for the Monisense AI backend.",
  responses: {
    200: {
      description: "Service is healthy",
      content: {
        "application/json": {
          schema: HealthResponseSchema,
        },
      },
    },
    500: errorResponses[500],
  },
});

export const readyRoute = createRoute({
  method: "get",
  path: "/ready",
  tags: ["System"],
  summary: "Readiness check",
  description: "Verifies the API can reach its database dependency.",
  responses: {
    200: {
      description: "Service is ready to serve traffic",
      content: {
        "application/json": {
          schema: ReadyResponseSchema,
        },
      },
    },
    500: errorResponses[500],
  },
});

export const parseSmsRoute = createRoute({
  method: "post",
  path: "/v1/ai/parse-sms",
  tags: ["AI"],
  summary: "Parse an SMS transaction",
  description:
    "Normalizes a raw transaction SMS, removes balance text, and extracts structured transaction fields.",
  security: [{ ApiSecretHeader: [] }],
  request: {
    headers: ApiSecretHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: ParseSmsRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Parsed SMS transaction",
      content: {
        "application/json": {
          schema: ParseSmsResponseSchema,
        },
      },
    },
    400: errorResponses[400],
    401: errorResponses[401],
    429: errorResponses[429],
    500: errorResponses[500],
  },
});

export const classifyTransactionRoute = createRoute({
  method: "post",
  path: "/v1/ai/classify-transaction",
  tags: ["AI"],
  summary: "Classify a transaction",
  description:
    "Uses merchant memory first, then Gemma when needed, and returns category guidance plus review state.",
  security: [{ ApiSecretHeader: [] }],
  request: {
    headers: ApiSecretHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: ClassificationRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Classification result",
      content: {
        "application/json": {
          schema: ClassificationResponseSchema,
        },
      },
    },
    400: errorResponses[400],
    401: errorResponses[401],
    429: errorResponses[429],
    500: errorResponses[500],
    502: errorResponses[502],
  },
});

export const feedbackRoute = createRoute({
  method: "post",
  path: "/v1/ai/feedback",
  tags: ["AI"],
  summary: "Submit classification feedback",
  description:
    "Stores user feedback about AI suggestions and updates merchant memory for future classifications.",
  security: [{ ApiSecretHeader: [] }],
  request: {
    headers: ApiSecretHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: FeedbackRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Feedback accepted",
      content: {
        "application/json": {
          schema: FeedbackResponseSchema,
        },
      },
    },
    400: errorResponses[400],
    401: errorResponses[401],
    429: errorResponses[429],
    500: errorResponses[500],
  },
});

const BatchParamsSchema = z.object({
  batchId: z.string().uuid().openapi({
    example: "8abf3216-4c65-4560-bdbb-83231be2d4fb",
  }),
});

const BatchQuerySchema = z.object({
  userId: z.string().min(1).openapi({
    example: "user_123",
  }),
});

export const bulkIngestSmsRoute = createRoute({
  method: "post",
  path: "/v1/ai/bulk/ingest-sms",
  tags: ["AI"],
  summary: "Queue bulk SMS ingestion",
  description:
    "Accepts many SMS messages at once, stores one classification job per message, and returns a batch id for polling.",
  security: [{ ApiSecretHeader: [] }],
  request: {
    headers: ApiSecretHeaderSchema,
    body: {
      required: true,
      content: {
        "application/json": {
          schema: BulkIngestSmsRequestSchema,
        },
      },
    },
  },
  responses: {
    202: {
      description: "Bulk SMS batch accepted",
      content: {
        "application/json": {
          schema: BulkIngestSmsResponseSchema,
        },
      },
    },
    400: errorResponses[400],
    401: errorResponses[401],
    429: errorResponses[429],
    500: errorResponses[500],
  },
});

export const batchStatusRoute = createRoute({
  method: "get",
  path: "/v1/ai/bulk/jobs/{batchId}",
  tags: ["AI"],
  summary: "Get bulk batch status",
  description: "Returns progress counters and current status for a queued SMS ingestion batch.",
  security: [{ ApiSecretHeader: [] }],
  request: {
    headers: ApiSecretHeaderSchema,
    params: BatchParamsSchema,
    query: BatchQuerySchema,
  },
  responses: {
    200: {
      description: "Bulk batch status",
      content: {
        "application/json": {
          schema: BatchStatusSchema,
        },
      },
    },
    400: errorResponses[400],
    401: errorResponses[401],
    404: errorResponses[404],
    429: errorResponses[429],
    500: errorResponses[500],
  },
});

export const batchResultsRoute = createRoute({
  method: "get",
  path: "/v1/ai/bulk/jobs/{batchId}/results",
  tags: ["AI"],
  summary: "Get bulk batch results",
  description: "Returns per-message parse and classification results for a queued SMS ingestion batch.",
  security: [{ ApiSecretHeader: [] }],
  request: {
    headers: ApiSecretHeaderSchema,
    params: BatchParamsSchema,
    query: BatchQuerySchema,
  },
  responses: {
    200: {
      description: "Bulk batch results",
      content: {
        "application/json": {
          schema: BatchResultsResponseSchema,
        },
      },
    },
    400: errorResponses[400],
    401: errorResponses[401],
    404: errorResponses[404],
    429: errorResponses[429],
    500: errorResponses[500],
  },
});
