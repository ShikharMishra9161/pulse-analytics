import type { ErrorCode, FieldErrors } from "./errors";

/**
 * The single response envelope used by every API route and server action:
 *   { ok: true,  data }
 *   { ok: false, error: { code, message, fieldErrors? } }
 */
export type ApiError = {
  code: ErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export const success = <T>(data: T): Result<T> => ({ ok: true, data });
export const failure = (error: ApiError): Result<never> => ({ ok: false, error });
