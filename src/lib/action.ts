import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { AppError } from "./errors";
import { failure, success, type Result } from "./result";
import { validationError } from "./validation";

/**
 * Wraps a server action with Zod validation and consistent error handling.
 * - Input is always validated server-side (client validation is a UX nicety only).
 * - AppErrors become `{ ok: false, error }`; unknown errors are logged and masked.
 * - Next.js control-flow errors (redirect, notFound) are re-thrown so they still work.
 */
export function createAction<S extends z.ZodTypeAny, R>(
  schema: S,
  handler: (input: z.output<S>) => Promise<R>,
): (input: z.input<S>) => Promise<Result<R>> {
  return async (input) => {
    try {
      const parsed = schema.safeParse(input);
      if (!parsed.success) throw validationError(parsed.error);
      return success(await handler(parsed.data));
    } catch (err) {
      return toFailure(err);
    }
  };
}

export function toFailure(err: unknown): Result<never> {
  unstable_rethrow(err);
  if (err instanceof AppError) {
    return failure({ code: err.code, message: err.message, fieldErrors: err.fieldErrors });
  }
  console.error("[action] unhandled error", err);
  return failure({ code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." });
}
