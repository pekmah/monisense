import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ErrorSeverity = "info" | "warning" | "error" | "fatal";
export type ErrorExposure = "FULL" | "MINIMAL";
export type ErrorType =
  | "validation"
  | "auth"
  | "business"
  | "not_found"
  | "conflict"
  | "internal";

export type ErrorDetail = {
  field?: string;
  location?: "body" | "query" | "params" | "request" | "system";
  message: string;
};

export class AppError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;
  readonly domain: string;
  readonly type: ErrorType;
  readonly severity: ErrorSeverity;
  readonly exposure: ErrorExposure;
  readonly displayTitle?: string;
  readonly displayMessage?: string;
  readonly details?: ErrorDetail[];
  readonly component?: string;
  readonly operation?: string;
  readonly metadata?: Record<string, unknown>;
  override readonly cause?: unknown;

  constructor(input: {
    status: ContentfulStatusCode;
    code: string;
    domain: string;
    type: ErrorType;
    message: string;
    severity?: ErrorSeverity;
    exposure?: ErrorExposure;
    displayTitle?: string;
    displayMessage?: string;
    details?: ErrorDetail[];
    component?: string;
    operation?: string;
    metadata?: Record<string, unknown>;
    cause?: unknown;
  }) {
    super(input.message, input.cause ? { cause: input.cause } : undefined);
    this.name = "AppError";
    this.status = input.status;
    this.code = input.code;
    this.domain = input.domain;
    this.type = input.type;
    this.severity = input.severity ?? "warning";
    this.exposure = input.exposure ?? "FULL";
    this.displayTitle = input.displayTitle;
    this.displayMessage = input.displayMessage;
    this.details = input.details;
    this.component = input.component;
    this.operation = input.operation;
    this.metadata = input.metadata;
    this.cause = input.cause;
  }
}
