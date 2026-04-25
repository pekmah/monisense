import type { MiddlewareHandler } from "hono";

import { env } from "./config.js";
import { raiseError } from "./errors.js";
import type { AppVariables } from "../types.js";

function readSecret(c: Parameters<MiddlewareHandler<{ Variables: AppVariables }>>[0]) {
  const header = c.req.header("authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  return c.req.header("x-api-secret")?.trim();
}

export const requireApiAuth: MiddlewareHandler<{ Variables: AppVariables }> = async (
  c,
  next,
) => {
  const secret = readSecret(c);
  if (!secret || secret !== env.API_SECRET) {
    throw raiseError("COMMON_UNAUTHORIZED", {
      component: "auth",
      operation: "require_api_auth",
    });
  }

  c.set("auth", {
    clientId: "mobile-app",
  });

  await next();
};
