import type { MiddlewareHandler } from "hono";
import { randomUUID, createHash } from "node:crypto";

import { env } from "./config.js";
import { raiseError } from "./errors.js";
import { log } from "./logger.js";
import type { AppVariables } from "../types.js";

const buckets = new Map<string, { count: number; resetAt: number }>();

export const requestContext: MiddlewareHandler<{ Variables: AppVariables }> = async (
  c,
  next,
) => {
  const requestId = c.req.header("x-request-id") ?? randomUUID();
  const reqLog = log.child({
    requestId,
    method: c.req.method,
    path: c.req.path,
  });

  c.set("requestId", requestId);
  c.set("log", reqLog);
  c.header("x-request-id", requestId);
  await next();
};

export const requestLogger: MiddlewareHandler<{ Variables: AppVariables }> = async (
  c,
  next,
) => {
  const start = performance.now();
  try {
    await next();
  } finally {
    const durationMs = Math.round(performance.now() - start);
    const reqLog = c.var.log ?? log;
    const status = c.res.status;
    const fields = {
      req: { method: c.req.method, path: c.req.path },
      res: { status },
      durationMs,
      clientId: c.get("auth")?.clientId,
    };
    if (status >= 500) reqLog.error("request", fields);
    else if (status >= 400) reqLog.warn("request", fields);
    else reqLog.info("request", fields);
  }
};

export const bodySizeLimit: MiddlewareHandler<{ Variables: AppVariables }> = async (
  c,
  next,
) => {
  const contentLengthHeader = c.req.header("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : 0;
  if (
    Number.isFinite(contentLength) &&
    contentLength > env.REQUEST_BODY_LIMIT_BYTES
  ) {
    throw raiseError("COMMON_INVALID_REQUEST", {
      message: "Request body too large.",
      component: "request",
      operation: "body_size_limit",
    });
  }
  await next();
};

export const rateLimit: MiddlewareHandler<{ Variables: AppVariables }> = async (
  c,
  next,
) => {
  const forwardedFor = c.req.header("x-forwarded-for") ?? "unknown";
  const key = createHash("sha256")
    .update(`${forwardedFor}:${c.req.path}`)
    .digest("hex");
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + env.RATE_LIMIT_WINDOW_MS,
    });
    await next();
    return;
  }

  if (bucket.count >= env.RATE_LIMIT_MAX_REQUESTS) {
    throw raiseError("COMMON_RATE_LIMITED", {
      component: "request",
      operation: "rate_limit",
    });
  }

  bucket.count += 1;
  await next();
};
