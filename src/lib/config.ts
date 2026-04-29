import "dotenv/config";
import { readFileSync } from "node:fs";
import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";
const parseBoolean = (value: unknown) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) return true;
    if (["0", "false", "no", "off"].includes(normalized)) return false;
  }
  return value;
};

const readSecretFile = (path: string | undefined) => {
  if (!path) return undefined;
  return readFileSync(path, "utf8").trim();
};

const resolveSecretEnv = (name: string) => {
  const direct = process.env[name];
  if (direct && direct.trim() !== "") return direct;

  const fromFile = readSecretFile(process.env[`${name}_FILE`]);
  if (fromFile && fromFile.trim() !== "") return fromFile;

  return undefined;
};

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default(isProduction ? "info" : "debug"),
  LOG_FORMAT: z.enum(["pretty", "json"]).default(isProduction ? "json" : "pretty"),
  DATABASE_URL: z.string().min(1),
  DATABASE_ADMIN_URL: z.string().min(1).optional(),
  API_SECRET: z.string().min(8),
  GEMMA_BASE_URL: z.string().url(),
  GEMMA_MODEL: z.string().min(1).default("gemma:7b"),
  GEMMA_TIMEOUT_MS: z.coerce.number().int().positive().default(12000),
  REQUEST_BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(16384),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
  ALLOW_MOCK_GEMMA: z.preprocess(parseBoolean, z.boolean().default(false)),
});

export type Env = z.infer<typeof EnvSchema>;

export const env = EnvSchema.parse({
  ...process.env,
  DATABASE_URL: resolveSecretEnv("DATABASE_URL"),
  DATABASE_ADMIN_URL: resolveSecretEnv("DATABASE_ADMIN_URL"),
  API_SECRET: resolveSecretEnv("API_SECRET"),
});
