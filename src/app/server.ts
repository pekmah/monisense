import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";

import { createDb } from "../db/client.js";
import { requireApiAuth } from "../lib/auth.js";
import { env } from "../lib/config.js";
import { GemmaClient } from "../modules/ai/gemma-client.js";
import { ClassificationService } from "../modules/classification/classification.service.js";
import { FeedbackService } from "../modules/feedback/feedback.service.js";
import { JobService } from "../modules/jobs/job.service.js";
import { handleAppError } from "../middleware/error.js";
import { bodySizeLimit, rateLimit, requestContext, requestLogger } from "../lib/request.js";
import type { AppVariables } from "../types.js";
import { registerRoutes } from "./routes.js";
import { log } from "../lib/logger.js";

const db = createDb(env.DATABASE_URL);
const gemmaClient = new GemmaClient();
const classificationService = new ClassificationService(db, gemmaClient);
const feedbackService = new FeedbackService(db);
const jobService = new JobService(db, classificationService);

const app = new OpenAPIHono<{ Variables: AppVariables }>();

app.onError(handleAppError);
app.use("*", requestContext);
app.use("*", requestLogger);
app.use("*", bodySizeLimit);
app.use("*", rateLimit);
app.use("*", async (c, next) => {
  c.set("db", db);
  c.set("classificationService", classificationService);
  c.set("feedbackService", feedbackService);
  c.set("jobService", jobService);
  await next();
});

app.use("/v1/*", requireApiAuth);

registerRoutes(app);

app.get("/openapi.json", (c) => {
  const document = app.getOpenAPIDocument({
    openapi: "3.0.0",
    info: {
      title: "Monisense AI Backend API",
      version: "1.0.0",
      description:
        "Documentation for SMS parsing, AI classification, feedback capture, health, and readiness endpoints.",
    },
    servers: [
      {
        url: `http://localhost:${env.PORT}`,
        description: "Local development",
      },
    ],
    tags: [
      { name: "System", description: "Operational status endpoints." },
      {
        name: "AI",
        description: "Transaction parsing, classification, and feedback endpoints.",
      },
    ],
  });

  return c.json({
    ...document,
    components: {
      ...(document.components ?? {}),
      securitySchemes: {
        ...((document.components as { securitySchemes?: Record<string, unknown> } | undefined)
          ?.securitySchemes ?? {}),
        ApiSecretHeader: {
          type: "apiKey",
          in: "header",
          name: "x-api-secret",
          description: "Shared API secret required for all /v1 routes.",
        },
      },
    },
  });
});

app.get(
  "/docs",
  swaggerUI({
    url: "/openapi.json",
    docExpansion: "list",
    persistAuthorization: true,
  }),
);

serve({
  fetch: app.fetch,
  port: env.PORT,
});

log.info("api_listening", {
  url: `http://localhost:${env.PORT}`,
});
