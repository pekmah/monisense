import { z } from "zod";

export const AiClassificationSchema = z.object({
  suggestedCategory: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reason: z.string().max(200),
  proposedNewCategory: z.string().nullable().optional(),
});

export type GemmaClassificationOutput = z.infer<typeof AiClassificationSchema>;

export function validateClassificationOutput(input: unknown) {
  return AiClassificationSchema.safeParse(input);
}
