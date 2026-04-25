import pino from "pino";

import { env } from "./config.js";

export const SERVICE_NAME = "monisense-ai-backend";

type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
type LogFormat = "pretty" | "json";
type LogFields = Record<string, unknown>;

export type Logger = {
  child: (bindings: LogFields) => Logger;
  trace: (message: string, fields?: LogFields) => void;
  debug: (message: string, fields?: LogFields) => void;
  info: (message: string, fields?: LogFields) => void;
  warn: (message: string, fields?: LogFields) => void;
  error: (message: string, fields?: LogFields) => void;
  fatal: (message: string, fields?: LogFields) => void;
};

function wrap(instance: pino.Logger): Logger {
  const write = (level: LogLevel, message: string, fields?: LogFields) => {
    if (fields) {
      instance[level](fields, message);
      return;
    }
    instance[level](message);
  };

  return {
    child: (bindings) => wrap(instance.child(bindings)),
    trace: (message, fields) => write("trace", message, fields),
    debug: (message, fields) => write("debug", message, fields),
    info: (message, fields) => write("info", message, fields),
    warn: (message, fields) => write("warn", message, fields),
    error: (message, fields) => write("error", message, fields),
    fatal: (message, fields) => write("fatal", message, fields),
  };
}

function createLogger(options?: {
  level?: LogLevel;
  format?: LogFormat;
  bindings?: LogFields;
}): Logger {
  const level = options?.level ?? env.LOG_LEVEL;
  const format = options?.format ?? env.LOG_FORMAT;
  const bindings = options?.bindings ?? {};

  const baseOptions: pino.LoggerOptions = {
    level,
    base: bindings,
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
    },
  };

  if (format === "pretty") {
    try {
      return wrap(
        pino(
          baseOptions,
          pino.transport({
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "SYS:standard",
              singleLine: true,
            },
          }),
        ),
      );
    } catch {
      return wrap(pino(baseOptions));
    }
  }

  return wrap(pino(baseOptions));
}

export const log = createLogger({
  bindings: {
    service: SERVICE_NAME,
  },
});
