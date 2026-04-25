import { serve } from "@hono/node-server";
import { Hono } from "hono";

import { createDb } from "../db/client.js";
import { requireApiAuth } from "../lib/auth.js";
import { env } from "../lib/config.js";
import { GemmaClient } from "../modules/ai/gemma-client.js";
import { ClassificationService } from "../modules/classification/classification.service.js";
import { FeedbackService } from "../modules/feedback/feedback.service.js";
import { handleAppError } from "../middleware/error.js";
import { bodySizeLimit, rateLimit, requestContext, requestLogger } from "../lib/request.js";
import type { AppVariables } from "../types.js";
import { registerRoutes } from "./routes.js";
import { log } from "../lib/logger.js";

const db = createDb(env.DATABASE_URL);
const gemmaClient = new GemmaClient();
const classificationService = new ClassificationService(db, gemmaClient);
const feedbackService = new FeedbackService(db);

const app = new Hono<{ Variables: AppVariables }>();

app.onError(handleAppError);
app.use("*", requestContext);
app.use("*", requestLogger);
app.use("*", bodySizeLimit);
app.use("*", rateLimit);
app.use("*", async (c, next) => {
  c.set("db", db);
  c.set("classificationService", classificationService);
  c.set("feedbackService", feedbackService);
  await next();
});

app.use("/v1/*", requireApiAuth);

registerRoutes(app);

serve({
  fetch: app.fetch,
  port: env.PORT,
});

log.info("api_listening", {
  url: `http://localhost:${env.PORT}`,
});
