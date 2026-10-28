import { describe, expect, it } from "vitest";
import { generateKeyPair, hashSecret, parseKey } from "@/features/api-keys/keys";
import { parseTimeRange } from "@/features/analytics/filters";
import { rateLimit } from "@/lib/rate-limit";
import { safeRedirectPath } from "@/lib/url";

describe("API key generation", () => {
  it("produces prefixed, unique, high-entropy keys and never stores the raw secret", () => {
    const a = generateKeyPair();
    const b = generateKeyPair();
    expect(a.publicKey).toMatch(/^pk_[0-9A-Za-z]{24}$/);
    expect(a.secretKey).toMatch(/^sk_[0-9A-Za-z]{40}$/);
    expect(a.publicKey).not.toBe(b.publicKey);
    expect(a.secretHash).toBe(hashSecret(a.secretKey));
    expect(a.secretHash).not.toContain(a.secretKey);
    expect(a.secretPrefix).toBe(a.secretKey.slice(0, 7));
  });

  it("parses only well-formed keys", () => {
    expect(parseKey(generateKeyPair().publicKey)?.kind).toBe("public");
    expect(parseKey(generateKeyPair().secretKey)?.kind).toBe("secret");
    expect(parseKey("pk_short")).toBeNull();
    expect(parseKey("Bearer pk_abc")).toBeNull();
    expect(parseKey("pk_' OR 1=1 --aaaaaaaaaaaaaaaaaa")).toBeNull();
    expect(parseKey(null)).toBeNull();
  });
});

describe("safeRedirectPath (open-redirect protection)", () => {
  it.each([
    ["/o/acme", "/o/acme"],
    ["/invite/abc?x=1", "/invite/abc?x=1"],
    ["//evil.com", "/dashboard"],
    ["https://evil.com/phish", "/dashboard"],
    ["javascript:alert(1)", "/dashboard"],
    ["/\\evil.com", "/dashboard"],
    [undefined, "/dashboard"],
  ])("%s -> %s", (input, expected) => {
    expect(safeRedirectPath(input, "/dashboard")).toBe(expected);
  });
});

describe("parseTimeRange", () => {
  const now = new Date("2026-06-15T12:00:00Z");

  it("defaults to 7 days with daily buckets", () => {
    const r = parseTimeRange({}, now);
    expect(r.preset).toBe("7d");
    expect(r.bucket).toBe("day");
    expect(now.getTime() - r.from.getTime()).toBe(7 * 86_400_000);
  });

  it("uses hourly buckets for 24h", () => {
    expect(parseTimeRange({ range: "24h" }, now).bucket).toBe("hour");
  });

  it("treats custom `to` as inclusive and caps it at now", () => {
    const r = parseTimeRange({ range: "custom", from: "2026-06-01", to: "2026-06-03" }, now);
    expect(r.from.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-06-04T00:00:00.000Z");
    const capped = parseTimeRange({ range: "custom", from: "2026-06-10", to: "2026-06-20" }, now);
    expect(capped.to).toEqual(now);
  });

  it("falls back on garbage input", () => {
    expect(parseTimeRange({ range: "custom", from: "nope", to: "2026-01-01" }, now).preset).toBe("7d");
    expect(parseTimeRange({ range: "1y" }, now).preset).toBe("7d");
  });
});

describe("in-memory rate limiter", () => {
  it("blocks after the limit within a window", async () => {
    const config = { prefix: `test-${Math.random()}`, limit: 3, windowSeconds: 60 };
    const results = [];
    for (let i = 0; i < 5; i++) results.push(await rateLimit(config, "key"));
    expect(results.map((r) => r.success)).toEqual([true, true, true, false, false]);
    expect(results[2]!.remaining).toBe(0);
    // Other keys are independent.
    expect((await rateLimit(config, "other")).success).toBe(true);
  });
});
