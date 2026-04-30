import type { MiddlewareHandler } from "hono";
import { randomUUID, createHash } from "node:crypto";

import { env } from "./config.js";
import { raiseError } from "./errors.js";
import { log } from "./logger.js";
import type { AppVariables } from "../types.js";

const buckets = new Map<string, { count: number; resetAt: number }>();

function getClientFingerprint(
  c: Parameters<MiddlewareHandler<{ Variables: AppVariables }>>[0],
) {
  const forwardedFor = c.req.header("x-forwarded-for");
  const realIp = c.req.header("x-real-ip");
  const cfIp = c.req.header("cf-connecting-ip");
  const apiSecret = c.req.header("x-api-secret");

  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    cfIp?.trim() ||
    "unknown";

  const secretFingerprint = apiSecret
    ? createHash("sha256").update(apiSecret).digest("hex")
    : "anonymous";

  return {
    ip,
    secretFingerprint,
  };
}

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
  const requestBodyLimit =
    c.req.path === "/v1/ai/bulk/ingest-sms"
      ? env.BULK_REQUEST_BODY_LIMIT_BYTES
      : env.REQUEST_BODY_LIMIT_BYTES;

  if (
    Number.isFinite(contentLength) &&
    contentLength > requestBodyLimit
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
  const fingerprint = getClientFingerprint(c);
  const key = createHash("sha256")
    .update(`${fingerprint.ip}:${fingerprint.secretFingerprint}:${c.req.method}:${c.req.path}`)
    .digest("hex");
  const now = Date.now();
  const bucket = buckets.get(key);
  const resetAt = bucket?.resetAt ?? now + env.RATE_LIMIT_WINDOW_MS;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - now) / 1000));

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + env.RATE_LIMIT_WINDOW_MS,
    });
    c.header("x-ratelimit-limit", String(env.RATE_LIMIT_MAX_REQUESTS));
    c.header("x-ratelimit-remaining", String(env.RATE_LIMIT_MAX_REQUESTS - 1));
    c.header("x-ratelimit-reset", String(now + env.RATE_LIMIT_WINDOW_MS));
    await next();
    return;
  }

  if (bucket.count >= env.RATE_LIMIT_MAX_REQUESTS) {
    c.header("retry-after", String(retryAfterSeconds));
    c.header("x-ratelimit-limit", String(env.RATE_LIMIT_MAX_REQUESTS));
    c.header("x-ratelimit-remaining", "0");
    c.header("x-ratelimit-reset", String(bucket.resetAt));
    throw raiseError("COMMON_RATE_LIMITED", {
      component: "request",
      operation: "rate_limit",
    });
  }

  bucket.count += 1;
  c.header("x-ratelimit-limit", String(env.RATE_LIMIT_MAX_REQUESTS));
  c.header(
    "x-ratelimit-remaining",
    String(Math.max(0, env.RATE_LIMIT_MAX_REQUESTS - bucket.count)),
  );
  c.header("x-ratelimit-reset", String(bucket.resetAt));
  await next();
};
