import { env } from "../../lib/config.js";
import { raiseError } from "../../lib/errors.js";
import type { Logger } from "../../lib/logger.js";

export type GemmaClassificationInput = {
  transactionType: string;
  amount: number | null;
  merchantName: string | null;
  cleanDescription: string;
  existingCategories: string[];
};

export type GemmaHttpResponse = {
  model?: string;
  response?: string;
};

export class GemmaClient {
  constructor(
    private readonly options: {
      baseUrl?: string;
      model?: string;
      timeoutMs?: number;
      allowMock?: boolean;
    } = {},
  ) {}

  async classify(prompt: string, log: Logger) {
    if (this.options.allowMock ?? env.ALLOW_MOCK_GEMMA) {
      return {
        modelName: this.options.model ?? env.GEMMA_MODEL,
        rawText: JSON.stringify({
          suggestedCategory: "Uncategorized",
          confidence: 0.51,
          reason: "Mock Gemma response.",
          proposedNewCategory: null,
        }),
        latencyMs: 1,
      };
    }

    const controller = new AbortController();
    const timeoutMs = this.options.timeoutMs ?? env.GEMMA_TIMEOUT_MS;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const start = performance.now();

    try {
      const response = await fetch(
        `${this.options.baseUrl ?? env.GEMMA_BASE_URL}/api/generate`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: this.options.model ?? env.GEMMA_MODEL,
            prompt,
            stream: false,
            format: "json",
          }),
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw raiseError("AI_UPSTREAM_FAILED", {
          component: "gemma-client",
          operation: "classify",
          metadata: {
            status: response.status,
          },
        });
      }

      const body = (await response.json()) as GemmaHttpResponse;
      return {
        modelName: body.model ?? this.options.model ?? env.GEMMA_MODEL,
        rawText: body.response ?? "",
        latencyMs: Math.round(performance.now() - start),
      };
    } catch (error) {
      log.error("gemma_request_failed", { err: error });
      if (error instanceof Error && error.name === "AbortError") {
        throw raiseError("AI_UPSTREAM_FAILED", {
          message: "Gemma inference timed out.",
          component: "gemma-client",
          operation: "classify",
          cause: error,
        });
      }
      if (error instanceof Error) {
        throw raiseError("AI_UPSTREAM_FAILED", {
          component: "gemma-client",
          operation: "classify",
          cause: error,
        });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
