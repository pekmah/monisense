import type { Context } from "hono";
import { z } from "zod";

import type { AppVariables } from "../../types.js";

const FeedbackSchema = z.object({
  userId: z.string().min(1),
  merchantName: z.string().nullable(),
  merchantKey: z.string().nullable(),
  aiSuggestedCategory: z.string().nullable(),
  finalCategory: z.string().min(1),
  wasAiCorrect: z.boolean(),
});

export async function feedbackController(c: Context<{ Variables: AppVariables }>) {
  const body = await c.req.json();
  const input = FeedbackSchema.parse(body);
  const service = c.get("feedbackService");
  await service.record(input);
  return c.json({ success: true }, 200);
}
