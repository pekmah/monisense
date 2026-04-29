import type { Context } from "hono";

import type { AppVariables } from "../../types.js";
import { FeedbackRequestSchema } from "./feedback.schemas.js";

export async function feedbackController(c: Context<{ Variables: AppVariables }>) {
  const body = await c.req.json();
  const input = FeedbackRequestSchema.parse(body);
  const service = c.get("feedbackService");
  await service.record(input);
  return c.json({ success: true }, 200);
}
