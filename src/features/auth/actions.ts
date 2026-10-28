"use server";

import { headers } from "next/headers";
import { AuthError, CredentialsSignin } from "next-auth";
import { revalidatePath } from "next/cache";
import { signIn, signOut } from "@/auth";
import { createAction } from "@/lib/action";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";
import { failure, type Result } from "@/lib/result";
import { safeRedirectPath } from "@/lib/url";
import { authenticate } from "@/server/session";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  updateProfileSchema,
  verifyEmailSchema,
  type LoginInput,
} from "./schemas";
import { hashPassword, registerUser, resendVerification, verifyEmail, verifyPassword } from "./service";

async function limitByIp(policy: (typeof RATE_LIMITS)[keyof typeof RATE_LIMITS], suffix = "") {
  const ip = clientIp(await headers());
  const result = await rateLimit(policy, `${ip}${suffix}`);
  if (!result.success) throw new AppError("RATE_LIMITED", "Too many attempts. Please wait a few minutes and try again.");
}

export const registerAction = createAction(registerSchema, async (input) => {
  await limitByIp(RATE_LIMITS.register);
  return registerUser(input);
});

export const resendVerificationAction = createAction(resendVerificationSchema, async ({ email }) => {
  await limitByIp(RATE_LIMITS.verifyEmail, `:${email}`);
  return resendVerification(email);
});

export const verifyEmailAction = createAction(verifyEmailSchema, async ({ email, token }) => {
  await limitByIp(RATE_LIMITS.verifyEmail);
  return { outcome: await verifyEmail(email, token) };
});

const LOGIN_ERRORS: Record<string, string> = {
  invalid_credentials: "Invalid email or password.",
  email_not_verified: "Please verify your email before signing in.",
  rate_limited: "Too many sign-in attempts. Please wait a few minutes.",
};

/** On success this redirects (throws NEXT_REDIRECT); it only returns on failure. */
export async function loginAction(input: LoginInput): Promise<Result<never>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return failure({ code: "VALIDATION_ERROR", message: "Enter your email and password." });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeRedirectPath(parsed.data.callbackUrl, "/dashboard"),
    });
  } catch (err) {
    if (err instanceof CredentialsSignin) {
      const code = err.code === "email_not_verified" ? "FORBIDDEN" : err.code === "rate_limited" ? "RATE_LIMITED" : "UNAUTHORIZED";
      return failure({ code, message: LOGIN_ERRORS[err.code] ?? LOGIN_ERRORS.invalid_credentials! });
    }
    if (err instanceof AuthError) {
      return failure({ code: "UNAUTHORIZED", message: "Sign-in failed. Please try again." });
    }
    throw err; // NEXT_REDIRECT on success
  }
  return failure({ code: "INTERNAL_ERROR", message: "Unexpected sign-in result." });
}

export async function googleSignInAction(callbackUrl?: string): Promise<void> {
  await signIn("google", { redirectTo: safeRedirectPath(callbackUrl, "/dashboard") });
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}

export const updateProfileAction = createAction(updateProfileSchema, async ({ name }) => {
  const user = await authenticate();
  await db.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/", "layout");
  return { name };
});

export const changePasswordAction = createAction(changePasswordSchema, async ({ currentPassword, newPassword }) => {
  const user = await authenticate();
  const record = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  // OAuth-only users may set an initial password without a current one.
  if (record.passwordHash) {
    if (!currentPassword || !(await verifyPassword(currentPassword, record.passwordHash))) {
      throw new AppError("VALIDATION_ERROR", "Current password is incorrect.", {
        currentPassword: ["Current password is incorrect."],
      });
    }
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  return { updated: true };
});
