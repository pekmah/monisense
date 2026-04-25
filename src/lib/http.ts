import type { AppError } from "./app-error.js";

export function jsonErrorFromAppError(err: AppError, requestId?: string) {
  return {
    error: {
      code: err.code,
      title: err.displayTitle,
      message:
        err.exposure === "FULL"
          ? err.message
          : (err.displayMessage ?? "Something went wrong."),
      details: err.details ?? [],
      requestId,
    },
  };
}
