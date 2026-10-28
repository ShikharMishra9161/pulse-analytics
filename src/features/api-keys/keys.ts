import "server-only";
import { randomBytes } from "node:crypto";
import { sha256 } from "@/lib/crypto";

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Unbiased base62 string (rejection sampling). */
function base62(length: number): string {
  let out = "";
  while (out.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte < 248) out += BASE62[byte % 62];
      if (out.length === length) break;
    }
  }
  return out;
}

export const PUBLIC_KEY_PREFIX = "pk_";
export const SECRET_KEY_PREFIX = "sk_";

export type GeneratedKeyPair = {
  publicKey: string;
  secretKey: string;
  secretHash: string;
  secretPrefix: string;
};

export function generateKeyPair(): GeneratedKeyPair {
  const publicKey = `${PUBLIC_KEY_PREFIX}${base62(24)}`;
  const secretKey = `${SECRET_KEY_PREFIX}${base62(40)}`;
  return { publicKey, secretKey, secretHash: hashSecret(secretKey), secretPrefix: secretKey.slice(0, 7) };
}

export const hashSecret = (secret: string) => sha256(secret);

const KEY_PATTERN = /^(pk|sk)_[0-9A-Za-z]{24,64}$/;

export function parseKey(raw: string | null | undefined): { kind: "public" | "secret"; value: string } | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!KEY_PATTERN.test(value)) return null;
  return { kind: value.startsWith(SECRET_KEY_PREFIX) ? "secret" : "public", value };
}
