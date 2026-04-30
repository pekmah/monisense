import { AppError, type ErrorDetail, type ErrorExposure, type ErrorSeverity, type ErrorType } from "./app-error.js";

type ErrorTemplate = {
  status: number;
  code: string;
  domain: string;
  type: ErrorType;
  severity?: ErrorSeverity;
  exposure?: ErrorExposure;
  message: string;
  displayTitle?: string;
  displayMessage?: string;
};

const catalog = {
  COMMON_INVALID_REQUEST: {
    status: 400,
    code: "COMMON.INVALID_REQUEST",
    domain: "COMMON",
    type: "validation",
    severity: "warning",
    exposure: "FULL",
    message: "Invalid request payload.",
    displayTitle: "Invalid Request",
  },
  COMMON_UNAUTHORIZED: {
    status: 401,
    code: "COMMON.UNAUTHORIZED",
    domain: "COMMON",
    type: "auth",
    severity: "warning",
    exposure: "FULL",
    message: "Unauthorized request.",
    displayTitle: "Unauthorized",
  },
  COMMON_RATE_LIMITED: {
    status: 429,
    code: "COMMON.RATE_LIMITED",
    domain: "COMMON",
    type: "business",
    severity: "warning",
    exposure: "FULL",
    message: "Too many requests.",
    displayTitle: "Rate Limited",
  },
  COMMON_NOT_FOUND: {
    status: 404,
    code: "COMMON.NOT_FOUND",
    domain: "COMMON",
    type: "not_found",
    severity: "warning",
    exposure: "FULL",
    message: "Requested resource was not found.",
    displayTitle: "Not Found",
  },
  COMMON_INTERNAL: {
    status: 500,
    code: "COMMON.INTERNAL_ERROR",
    domain: "COMMON",
    type: "internal",
    severity: "error",
    exposure: "MINIMAL",
    message: "Internal server error.",
    displayTitle: "Internal Error",
    displayMessage: "Something went wrong. Retry shortly.",
  },
  AI_UPSTREAM_FAILED: {
    status: 502,
    code: "AI.UPSTREAM_FAILED",
    domain: "AI",
    type: "internal",
    severity: "error",
    exposure: "MINIMAL",
    message: "Gemma inference request failed.",
    displayTitle: "AI Service Error",
    displayMessage: "Classification is temporarily unavailable.",
  },
} satisfies Record<string, ErrorTemplate>;

export type ErrorKey = keyof typeof catalog;

export function raiseError(
  key: ErrorKey,
  input?: {
    message?: string;
    details?: ErrorDetail[];
    component?: string;
    operation?: string;
    metadata?: Record<string, unknown>;
    cause?: unknown;
  },
) {
  const template = catalog[key];
  return new AppError({
    ...template,
    status: template.status as AppError["status"],
    message: input?.message ?? template.message,
    details: input?.details,
    component: input?.component,
    operation: input?.operation,
    metadata: input?.metadata,
    cause: input?.cause,
  });
}
