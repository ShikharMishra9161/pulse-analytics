import { beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { authenticateCredentials, registerUser, verifyEmail } from "@/features/auth/service";
import { registerSchema } from "@/features/auth/schemas";
import { db, resetDatabase } from "../db";

const input = { name: "Ada Lovelace", email: "ada@example.com", password: "analytical1" };

function tokenFrom(url: string | undefined) {
  const params = new URL(url!).searchParams;
  return { email: params.get("email")!, token: params.get("token")! };
}

describe("registration & email verification", () => {
  beforeEach(resetDatabase);

  it("stores a bcrypt hash, never the plaintext password", async () => {
    await registerUser(input);
    const user = await db.user.findUniqueOrThrow({ where: { email: input.email } });
    expect(user.passwordHash).not.toBe(input.password);
    expect(user.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(await bcrypt.compare(input.password, user.passwordHash!)).toBe(true);
    expect(user.emailVerified).toBeNull();
  });

  it("stores only a hash of the verification token", async () => {
    const { devVerificationUrl } = await registerUser(input);
    const { token } = tokenFrom(devVerificationUrl);
    const stored = await db.verificationToken.findFirstOrThrow({ where: { identifier: input.email } });
    expect(stored.token).not.toBe(token);
    expect(stored.token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("verifies with a valid token exactly once", async () => {
    const { email, token } = tokenFrom((await registerUser(input)).devVerificationUrl);
    expect(await verifyEmail(email, token)).toBe("verified");
    expect((await db.user.findUniqueOrThrow({ where: { email } })).emailVerified).not.toBeNull();
    expect(await verifyEmail(email, token)).toBe("invalid");
  });

  it("rejects wrong and expired tokens", async () => {
    const { email, token } = tokenFrom((await registerUser(input)).devVerificationUrl);
    expect(await verifyEmail(email, "x".repeat(43))).toBe("invalid");
    expect(await verifyEmail("someone@else.com", token)).toBe("invalid");
    await db.verificationToken.updateMany({ data: { expires: new Date(Date.now() - 1000) } });
    expect(await verifyEmail(email, token)).toBe("expired");
  });

  it("does not create a second account or reveal that the email exists", async () => {
    await registerUser(input);
    await verifyEmail(...(Object.values(tokenFrom((await registerUser(input)).devVerificationUrl)) as [string, string]));
    const again = await registerUser({ ...input, password: "different99" });
    expect(again).toEqual({}); // same shape as any other success, no link, no error
    expect(await db.user.count()).toBe(1);
  });

  it("validates password strength and normalizes email", () => {
    expect(registerSchema.safeParse({ ...input, password: "short1" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...input, password: "onlyletters" }).success).toBe(false);
    const parsed = registerSchema.parse({ ...input, email: "  ADA@Example.COM " });
    expect(parsed.email).toBe("ada@example.com");
  });
});

describe("credentials sign-in", () => {
  beforeEach(resetDatabase);

  it("blocks unverified accounts", async () => {
    await registerUser(input);
    expect(await authenticateCredentials(input.email, input.password)).toEqual({ ok: false, reason: "email_not_verified" });
  });

  it("signs in a verified user with the right password only", async () => {
    const { email, token } = tokenFrom((await registerUser(input)).devVerificationUrl);
    await verifyEmail(email, token);

    const ok = await authenticateCredentials(email, input.password);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.user).not.toHaveProperty("passwordHash");

    expect(await authenticateCredentials(email, "wrong-password1")).toEqual({ ok: false, reason: "invalid_credentials" });
  });

  it("returns the same error for unknown emails (no user enumeration)", async () => {
    expect(await authenticateCredentials("nobody@example.com", "whatever123")).toEqual({
      ok: false,
      reason: "invalid_credentials",
    });
  });

  it("rejects password sign-in for OAuth-only accounts", async () => {
    await db.user.create({ data: { email: "g@example.com", emailVerified: new Date() } });
    expect((await authenticateCredentials("g@example.com", "anything123")).ok).toBe(false);
  });
});
