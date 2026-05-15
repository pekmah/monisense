import type { GemmaClassificationInput } from "../ai/gemma-client.js";

export function buildClassificationPrompt(input: GemmaClassificationInput) {
  return [
    "You classify finance transactions for a Kenyan personal finance app.",
    "Return JSON only.",
    "Prefer one of the existing categories.",
    "Do not invent a new category unless none of the existing categories fit.",
    "Never include balance information.",
    "Keep the reason short.",
    "Mark low-confidence results honestly.",
    "",
    "Transaction:",
    JSON.stringify(
      {
        transactionType: input.transactionType,
        amount: input.amount,
        merchantName: input.merchantName,
        cleanDescription: input.cleanDescription,
      },
      null,
      2,
    ),
    "",
    "Existing categories:",
    JSON.stringify(input.existingCategories),
    "",
    "User learning memory:",
    JSON.stringify(
      (input.learnedExamples ?? []).map((example) => ({
        merchant: example.merchantDisplayName,
        merchantKey: example.merchantKey,
        direction: example.direction,
        amountBand: example.amountBand,
        correctCategory: example.finalCategory,
        rejectedCategory: example.rejectedCategory,
        weight: example.weight,
      })),
      null,
      2,
    ),
    "If a learned example strongly matches the current merchant, prefer its correctCategory.",
    "Never choose a rejectedCategory for the same merchant unless the current transaction clearly differs.",
    "",
    "Return this JSON shape exactly:",
    JSON.stringify(
      {
        suggestedCategory: "Groceries",
        confidence: 0.86,
        reason: "Merchant appears to be a supermarket",
        proposedNewCategory: null,
      },
      null,
      2,
    ),
  ].join("\n");
}
