import { AppError } from "../lib/app-error.js";
import { persistErrorEvent, shouldPersistError } from "../lib/error-persist.js";
import { raiseError } from "../lib/errors.js";
import { jsonErrorFromAppError } from "../lib/http.js";
import { log } from "../lib/logger.js";
import type { AppVariables } from "../types.js";
import type { Context } from "hono";
import { z } from "zod";

export async function handleAppError(
  err: unknown,
  c: Context<{ Variables: AppVariables }>,
) {
  const requestId = c.var.requestId;
  const reqLog = c.var.log ?? log;
  const db = c.get("db");

  let appError: AppError;

  if (err instanceof AppError) {
    appError = err;
  } else if (err instanceof z.ZodError) {
    const zodError = err as z.ZodError;
    appError = raiseError("COMMON_INVALID_REQUEST", {
      component: "validation",
      operation: "parse_request",
      details: zodError.issues.map((issue: { path: PropertyKey[]; message: string }) => ({
        field: issue.path.join("."),
        location: "body",
        message: issue.message,
      })),
    });
  } else {
    appError = raiseError("COMMON_INTERNAL", {
      component: "app",
      operation: "global_error_handler",
      cause: err,
    });
  }

  const fields = {
    requestId,
    code: appError.code,
    domain: appError.domain,
    type: appError.type,
    severity: appError.severity,
    status: appError.status,
    method: c.req.method,
    path: c.req.path,
    clientId: c.get("auth")?.clientId,
    details: appError.details,
    err: appError.cause ?? appError,
  };

  if (appError.severity === "fatal") reqLog.fatal("app_error", fields);
  else if (appError.severity === "error") reqLog.error("app_error", fields);
  else if (appError.severity === "warning") reqLog.warn("app_error", fields);
  else reqLog.info("app_error", fields);

  if (db && shouldPersistError(appError)) {
    await persistErrorEvent({
      db,
      err: appError,
      requestId,
      method: c.req.method,
      path: c.req.path,
      clientId: c.get("auth")?.clientId,
    });
  }

  return c.json(jsonErrorFromAppError(appError, requestId), appError.status);
}
