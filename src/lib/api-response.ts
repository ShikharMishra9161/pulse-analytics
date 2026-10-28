import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";
import type { Result } from "./result";
import { validationError } from "./validation";

export function apiSuccess<T>(data: T, init?: ResponseInit): NextResponse<Result<T>> {
  return NextResponse.json({ ok: true, data }, init);
}

export function apiError(error: AppError, init?: ResponseInit): NextResponse<Result<never>> {
  return NextResponse.json(
    {
      ok: false,
      error: { code: error.code, message: error.message, ...(error.fieldErrors && { fieldErrors: error.fieldErrors }) },
    },
    { ...init, status: error.status },
  );
}

/** Converts any thrown value into a safe JSON error response. Internal details are logged, never returned. */
export function handleRouteError(err: unknown, init?: ResponseInit): NextResponse<Result<never>> {
  if (err instanceof AppError) return apiError(err, init);
  if (err instanceof ZodError) return apiError(validationError(err), init);
  console.error("[api] unhandled error", err);
  return apiError(new AppError("INTERNAL_ERROR", "Something went wrong."), init);
}
