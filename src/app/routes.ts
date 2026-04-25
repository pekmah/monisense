import { Hono } from "hono";
import { sql } from "drizzle-orm";

import { parseSmsTransaction } from "../modules/sms/sms-parser.js";
import { ParseSmsRequestSchema } from "../modules/sms/sms.schemas.js";
import { classifyTransactionController } from "../modules/classification/classification.controller.js";
import { feedbackController } from "../modules/feedback/feedback.controller.js";
import type { AppVariables } from "../types.js";

export function registerRoutes(app: Hono<{ Variables: AppVariables }>) {
  app.get("/health", (c) =>
    c.json(
      {
        status: "ok",
        service: "monisense-ai-backend",
      },
      200,
    ),
  );

  app.get("/ready", async (c) => {
    await c.var.db.execute(sql`select 1`);
    return c.json(
      {
        status: "ready",
      },
      200,
    );
  });

  app.post("/v1/ai/parse-sms", async (c) => {
    const body = await c.req.json();
    const input = ParseSmsRequestSchema.parse(body);
    const parsed = parseSmsTransaction(input.message);
    return c.json(parsed, 200);
  });

  app.post("/v1/ai/classify-transaction", classifyTransactionController);
  app.post("/v1/ai/feedback", feedbackController);
}
