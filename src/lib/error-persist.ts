import type { Db } from "../db/client.js";
import { errorEvents } from "../db/schema.js";
import type { AppError } from "./app-error.js";
import { log, SERVICE_NAME } from "./logger.js";

function getCauseMessage(cause: unknown): string | undefined {
  if (!cause) return undefined;
  if (cause instanceof Error) return cause.message;
  if (typeof cause === "string") return cause;
  try {
    return JSON.stringify(cause);
  } catch {
    return String(cause);
  }
}

function getStack(cause: unknown) {
  if (cause instanceof Error) return cause.stack;
  return undefined;
}

export function shouldPersistError(err: AppError) {
  return err.severity === "error" || err.severity === "fatal" || err.status >= 500;
}

export async function persistErrorEvent(input: {
  db: Db;
  err: AppError;
  requestId?: string;
  method?: string;
  path?: string;
  clientId?: string;
}) {
  try {
    const now = new Date();
    await input.db.insert(errorEvents).values({
      requestId: input.requestId,
      code: input.err.code,
      domain: input.err.domain,
      type: input.err.type,
      severity: input.err.severity,
      exposure: input.err.exposure,
      status: input.err.status,
      message: input.err.message,
      displayTitle: input.err.displayTitle,
      displayMessage: input.err.displayMessage,
      details: input.err.details ?? [],
      causeMessage: getCauseMessage(input.err.cause),
      stack: getStack(input.err.cause ?? input.err),
      service: SERVICE_NAME,
      component: input.err.component,
      operation: input.err.operation,
      method: input.method,
      path: input.path,
      clientId: input.clientId,
      metadata: input.err.metadata ?? {},
      occurredAt: now,
      firstSeenAt: now,
      lastSeenAt: now,
    });
  } catch (error) {
    log.error("error_event_persist_failed", {
      err: error,
      originalCode: input.err.code,
      requestId: input.requestId,
    });
  }
}
