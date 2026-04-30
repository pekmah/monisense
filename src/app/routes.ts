import { OpenAPIHono } from "@hono/zod-openapi";
import { sql } from "drizzle-orm";

import {
  batchStreamRoute,
  batchResultsRoute,
  batchStatusRoute,
  bulkIngestSmsRoute,
  classifyTransactionRoute,
  feedbackRoute,
  healthRoute,
  parseSmsRoute,
  readyRoute,
} from "./openapi.js";
import { parseSmsTransaction } from "../modules/sms/sms-parser.js";
import { ParseSmsRequestSchema } from "../modules/sms/sms.schemas.js";
import { classifyTransactionController } from "../modules/classification/classification.controller.js";
import { feedbackController } from "../modules/feedback/feedback.controller.js";
import {
  bulkIngestSmsController,
  getBatchResultsController,
  getBatchStatusController,
  streamBatchStatusController,
} from "../modules/jobs/job.controller.js";
import type { AppVariables } from "../types.js";

export function registerRoutes(app: OpenAPIHono<{ Variables: AppVariables }>) {
  app.openapi(healthRoute, (c) =>
    c.json(
      {
        status: "ok",
        service: "monisense-ai-backend",
      },
      200,
    ),
  );

  app.openapi(readyRoute, async (c) => {
    await c.var.db.execute(sql`select 1`);
    return c.json(
      {
        status: "ready",
      },
      200,
    );
  });

  app.openapi(parseSmsRoute, async (c) => {
    const body = await c.req.json();
    const input = ParseSmsRequestSchema.parse(body);
    const parsed = parseSmsTransaction(input.message);
    return c.json(parsed, 200);
  });

  app.openapi(classifyTransactionRoute, classifyTransactionController);
  app.openapi(feedbackRoute, feedbackController);
  app.openapi(bulkIngestSmsRoute, bulkIngestSmsController);
  app.openapi(batchStatusRoute, getBatchStatusController);
  app.openapi(batchResultsRoute, getBatchResultsController);
  app.openapi(batchStreamRoute, streamBatchStatusController);
}
