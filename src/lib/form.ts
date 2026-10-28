"use client";

import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import type { Result } from "./result";

/**
 * Applies a server-action result to the UI: maps field errors back onto the
 * form, toasts the error otherwise. Returns the data on success.
 */
export function handleResult<T, F extends FieldValues = FieldValues>(
  result: Result<T>,
  options: { setError?: UseFormSetError<F>; success?: string } = {},
): T | undefined {
  if (result.ok) {
    if (options.success) toast.success(options.success);
    return result.data;
  }
  const { fieldErrors, message } = result.error;
  let mapped = false;
  if (fieldErrors && options.setError) {
    for (const [key, messages] of Object.entries(fieldErrors)) {
      if (key === "_root" || !messages[0]) continue;
      options.setError(key as Path<F>, { type: "server", message: messages[0] });
      mapped = true;
    }
  }
  if (!mapped) toast.error(message);
  return undefined;
}
