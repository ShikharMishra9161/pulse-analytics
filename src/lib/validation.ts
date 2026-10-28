import type { ZodError } from "zod";
import { AppError, type FieldErrors } from "./errors";

export function zodFieldErrors(error: ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function validationError(error: ZodError, message = "Invalid input."): AppError {
  return new AppError("VALIDATION_ERROR", message, zodFieldErrors(error));
}
