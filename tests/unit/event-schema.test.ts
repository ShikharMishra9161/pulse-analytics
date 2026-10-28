import { describe, expect, it } from "vitest";
import { MAX_BATCH_SIZE, parseIngestBody } from "@/features/events/schemas";

const valid = { event: "signup", distinctId: "user_1", properties: { plan: "pro", seats: 3, nested: { a: [1, 2] } } };

describe("parseIngestBody", () => {
  it("accepts a single event and defaults properties", () => {
    const r = parseIngestBody({ event: "page_view", distinctId: "u" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.events).toEqual([{ event: "page_view", distinctId: "u", timestamp: undefined, properties: {} }]);
  });

  it("accepts a batch and strips api_key from events", () => {
    const r = parseIngestBody({ api_key: "pk_x", batch: [valid, { ...valid, event: "login" }] });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.events.map((e) => e.event)).toEqual(["signup", "login"]);
      expect(r.events[0]).not.toHaveProperty("api_key");
    }
  });

  it("parses ISO and epoch-ms timestamps", () => {
    const iso = "2026-01-01T12:00:00.000Z";
    const r1 = parseIngestBody({ ...valid, timestamp: iso });
    const r2 = parseIngestBody({ ...valid, timestamp: Date.parse(iso) });
    for (const r of [r1, r2]) {
      expect(r.success).toBe(true);
      if (r.success && r.events[0]!.timestamp) {
        // Only when within the 1-year backfill window relative to now.
        expect(r.events[0]!.timestamp.toISOString()).toBe(iso);
      }
    }
  });

  it("rejects missing fields with field-level errors", () => {
    const r = parseIngestBody({ event: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("event");
      expect(paths).toContain("distinctId");
    }
  });

  it("rejects unknown top-level keys", () => {
    expect(parseIngestBody({ ...valid, userId: "x" }).success).toBe(false);
  });

  it("rejects timestamps far in the future", () => {
    const future = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    expect(parseIngestBody({ ...valid, timestamp: future }).success).toBe(false);
  });

  it("rejects control characters and NUL bytes", () => {
    expect(parseIngestBody({ ...valid, event: "bad\u0000name" }).success).toBe(false);
    expect(parseIngestBody({ ...valid, properties: { a: "x\u0000y" } }).success).toBe(false);
  });

  it("rejects oversized and overly deep properties", () => {
    expect(parseIngestBody({ ...valid, properties: { blob: "x".repeat(17 * 1024) } }).success).toBe(false);
    const deep = { a: { b: { c: { d: { e: { f: { g: 1 } } } } } } };
    expect(parseIngestBody({ ...valid, properties: deep }).success).toBe(false);
  });

  it("enforces batch bounds", () => {
    expect(parseIngestBody({ batch: [] }).success).toBe(false);
    const tooMany = Array.from({ length: MAX_BATCH_SIZE + 1 }, () => valid);
    expect(parseIngestBody({ batch: tooMany }).success).toBe(false);
  });

  it("rejects non-object bodies", () => {
    expect(parseIngestBody([valid]).success).toBe(false);
    expect(parseIngestBody("hello").success).toBe(false);
    expect(parseIngestBody(null).success).toBe(false);
  });
});
