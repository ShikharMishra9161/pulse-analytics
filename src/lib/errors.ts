export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

/** Field-level validation messages, keyed by dotted path. */
export type FieldErrors = Record<string, string[]>;

/**
 * An expected, user-facing error. Anything else thrown is treated as an
 * internal error and its message is never shown to clients.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors?: FieldErrors;

  constructor(code: ErrorCode, message: string, fieldErrors?: FieldErrors) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.fieldErrors = fieldErrors;
  }
}

export const unauthorized = (message = "You must be signed in.") => new AppError("UNAUTHORIZED", message);
export const forbidden = (message = "You don't have permission to do that.") => new AppError("FORBIDDEN", message);
export const notFound = (what = "Resource") => new AppError("NOT_FOUND", `${what} not found.`);
export const conflict = (message: string) => new AppError("CONFLICT", message);
export const badRequest = (message: string) => new AppError("BAD_REQUEST", message);
