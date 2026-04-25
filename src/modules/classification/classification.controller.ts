import type { Context } from "hono";

import type { AppVariables } from "../../types.js";
import { ClassificationRequestSchema } from "./classification.schemas.js";

export async function classifyTransactionController(
  c: Context<{ Variables: AppVariables }>,
) {
  const body = await c.req.json();
  const input = ClassificationRequestSchema.parse(body);
  const service = c.get("classificationService");
  const result = await service.classify(input, c.var.log);
  return c.json(result, 200);
}
