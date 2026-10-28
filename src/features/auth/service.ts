import "server-only";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { appUrl, sendMail } from "@/lib/mail";
import type { RegisterInput } from "./schemas";

const BCRYPT_COST = 12;
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
// Pre-computed hash used to keep timing constant when the user doesn't exist.
const DUMMY_HASH = "$2b$12$ag91O8/RS/TROQkNeOHUWuQc32K2F.i6WHy/o5S2dSDOwOrG9py.m";

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

/** Dev-only links returned to the UI because email delivery is mocked. */
const exposeDevLinks = () => process.env.NODE_ENV !== "production";

export type RegisterResult = {
  /** Only populated outside production, so the mocked email flow is usable. */
  devVerificationUrl?: string;
};

/**
 * Registers a user. Never reveals whether an email is already registered:
 * the caller always shows "check your inbox", and an existing account owner
 * gets a notice email instead.
 */
export async function registerUser(input: RegisterInput): Promise<RegisterResult> {
  const existing = await db.user.findUnique({ where: { email: input.email } });

  if (existing) {
    if (!existing.emailVerified && existing.passwordHash) {
      const url = await sendVerificationEmail(existing.email);
      return exposeDevLinks() ? { devVerificationUrl: url } : {};
    }
    await sendMail({
      to: existing.email,
      subject: "Sign-up attempt on Pulse",
      text: `Someone tried to create a Pulse account with this email.\nIf this was you, sign in instead: ${appUrl("/login")}`,
    });
    return {};
  }

  await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    },
  });
  const url = await sendVerificationEmail(input.email);
  return exposeDevLinks() ? { devVerificationUrl: url } : {};
}

export async function createVerificationToken(email: string): Promise<string> {
  const token = randomToken(32);
  await db.$transaction([
    db.verificationToken.deleteMany({ where: { identifier: email } }),
    db.verificationToken.create({
      data: { identifier: email, token: sha256(token), expires: new Date(Date.now() + VERIFICATION_TTL_MS) },
    }),
  ]);
  return token;
}

export async function sendVerificationEmail(email: string): Promise<string> {
  const token = await createVerificationToken(email);
  const url = appUrl(`/verify-email?${new URLSearchParams({ email, token })}`);
  await sendMail({
    to: email,
    subject: "Verify your email for Pulse",
    text: `Welcome to Pulse!\n\nConfirm your email address (link valid for 24 hours):\n${url}`,
  });
  return url;
}

export async function resendVerification(email: string): Promise<RegisterResult> {
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.emailVerified) return {};
  const url = await sendVerificationEmail(email);
  return exposeDevLinks() ? { devVerificationUrl: url } : {};
}

export type VerifyEmailOutcome = "verified" | "invalid" | "expired";

export async function verifyEmail(email: string, token: string): Promise<VerifyEmailOutcome> {
  const record = await db.verificationToken.findUnique({
    where: { identifier_token: { identifier: email, token: sha256(token) } },
  });
  if (!record) return "invalid";
  if (record.expires < new Date()) {
    await db.verificationToken.deleteMany({ where: { identifier: email } });
    return "expired";
  }
  await db.$transaction([
    db.user.updateMany({ where: { email, emailVerified: null }, data: { emailVerified: new Date() } }),
    db.verificationToken.deleteMany({ where: { identifier: email } }),
  ]);
  return "verified";
}

export type CredentialsOutcome =
  | { ok: true; user: { id: string; email: string; name: string | null; image: string | null } }
  | { ok: false; reason: "invalid_credentials" | "email_not_verified" };

export async function authenticateCredentials(email: string, password: string): Promise<CredentialsOutcome> {
  const user = await db.user.findUnique({ where: { email } });
  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.passwordHash || !valid) return { ok: false, reason: "invalid_credentials" };
  if (!user.emailVerified) return { ok: false, reason: "email_not_verified" };
  return { ok: true, user: { id: user.id, email: user.email, name: user.name, image: user.image } };
}
