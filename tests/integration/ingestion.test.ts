import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// `after()` needs a live request scope; run the callback inline instead.
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (fn: () => unknown) => void Promise.resolve().then(fn) };
});

import { POST, OPTIONS } from "@/app/api/v1/events/route";
import { createApiKey, invalidateKeyCache, revokeApiKey } from "@/features/api-keys/service";
import type { Result } from "@/lib/result";
import { db, resetDatabase } from "../db";

const URL_ = "http://localhost:3000/api/v1/events";

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new NextRequest(URL_, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

async function setup() {
  const org = await db.organization.create({ data: { name: "Test Org", slug: `t-${Math.random().toString(36).slice(2, 8)}` } });
  const project = await db.project.create({ data: { organizationId: org.id, name: "Test" } });
  const key = await createApiKey({ projectId: project.id, name: "test", createdById: (await db.user.create({ data: { email: `u${Date.now()}@x.dev` } })).id });
  return { project, key };
}

describe("POST /api/v1/events", () => {
  beforeEach(async () => {
    await resetDatabase();
    invalidateKeyCache();
  });

  it("ingests a single event with a public key", async () => {
    const { project, key } = await setup();
    const res = await post({ event: "signup", distinctId: "u1", properties: { plan: "pro" } }, { authorization: `Bearer ${key.publicKey}` });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true, data: { accepted: 1 } });

    const events = await db.event.findMany({ where: { projectId: project.id } });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ name: "signup", distinctId: "u1", properties: { plan: "pro" } });
    expect(res.headers.get("x-ratelimit-limit")).toBeTruthy();
  });

  it("ingests a batch with a secret key and maintains first/last seen per user", async () => {
    const { project, key } = await setup();
    const day1 = new Date(Date.now() - 2 * 86_400_000);
    const day2 = new Date(Date.now() - 86_400_000);
    const res = await post(
      {
        batch: [
          { event: "a", distinctId: "u1", timestamp: day2.toISOString() },
          { event: "b", distinctId: "u1", timestamp: day1.toISOString() },
          { event: "c", distinctId: "u2" },
        ],
      },
      { "x-api-key": key.secretKey },
    );
    expect(res.status).toBe(202);
    expect(await db.event.count({ where: { projectId: project.id } })).toBe(3);

    const u1 = await db.projectUser.findUniqueOrThrow({ where: { projectId_distinctId: { projectId: project.id, distinctId: "u1" } } });
    expect(u1.firstSeenAt.toISOString()).toBe(day1.toISOString());
    expect(u1.lastSeenAt.toISOString()).toBe(day2.toISOString());
    expect(await db.projectUser.count({ where: { projectId: project.id } })).toBe(2);
  });

  it("keeps project_users first-seen correct across requests", async () => {
    const { project, key } = await setup();
    const now = Date.now();
    const auth = { authorization: `Bearer ${key.publicKey}` };
    await post({ event: "x", distinctId: "u", timestamp: now - 1000 }, auth);
    await post({ event: "x", distinctId: "u", timestamp: now - 60_000 }, auth);
    await post({ event: "x", distinctId: "u", timestamp: now }, auth);
    const u = await db.projectUser.findFirstOrThrow({ where: { projectId: project.id } });
    expect(u.firstSeenAt.getTime()).toBe(now - 60_000);
    expect(u.lastSeenAt.getTime()).toBe(now);
  });

  it("accepts the key in the body for navigator.sendBeacon", async () => {
    const { key } = await setup();
    const res = await post({ api_key: key.publicKey, event: "beacon", distinctId: "u" });
    expect(res.status).toBe(202);
  });

  it("tracks key usage", async () => {
    const { key } = await setup();
    await post({ event: "e", distinctId: "u" }, { authorization: `Bearer ${key.publicKey}` });
    await vi.waitFor(async () => {
      const k = await db.apiKey.findUniqueOrThrow({ where: { id: key.id } });
      expect(Number(k.requestCount)).toBe(1);
      expect(k.lastUsedAt).not.toBeNull();
    });
  });

  it("rejects missing, malformed and unknown keys with 401", async () => {
    await setup();
    for (const headers of [{} as Record<string, string>, { authorization: "Bearer nope" }, { authorization: "Bearer pk_000000000000000000000000" }]) {
      const res = await post({ event: "e", distinctId: "u" }, headers);
      expect(res.status).toBe(401);
      const body = (await res.json()) as Result<never>;
      expect(body.ok).toBe(false);
      if (!body.ok) expect(body.error.code).toBe("UNAUTHORIZED");
    }
    expect(await db.event.count()).toBe(0);
  });

  it("rejects revoked keys", async () => {
    const { project, key } = await setup();
    await revokeApiKey(project.id, key.id);
    const res = await post({ event: "e", distinctId: "u" }, { authorization: `Bearer ${key.publicKey}` });
    expect(res.status).toBe(401);
  });

  it("returns 422 with field errors for invalid payloads and stores nothing", async () => {
    const { key } = await setup();
    const res = await post({ event: "", distinctId: 5 }, { authorization: `Bearer ${key.publicKey}` });
    expect(res.status).toBe(422);
    const body = (await res.json()) as Result<never>;
    if (body.ok) throw new Error("expected failure");
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(body.error.fieldErrors ?? {})).toEqual(expect.arrayContaining(["event", "distinctId"]));
    expect(await db.event.count()).toBe(0);
  });

  it("returns 400 for invalid JSON and 413 for oversized bodies", async () => {
    const { key } = await setup();
    const auth = { authorization: `Bearer ${key.publicKey}` };
    expect((await post("{not json", auth)).status).toBe(400);
    expect((await post({ event: "e", distinctId: "u", properties: { x: "y".repeat(600 * 1024) } }, auth)).status).toBe(413);
  });

  it("rate limits per API key", async () => {
    vi.stubEnv("INGEST_RATE_LIMIT_PER_MINUTE", "3");
    try {
      const { key } = await setup();
      const auth = { authorization: `Bearer ${key.publicKey}` };
      const statuses = [];
      for (let i = 0; i < 5; i++) statuses.push((await post({ event: "e", distinctId: "u" }, auth)).status);
      expect(statuses).toEqual([202, 202, 202, 429, 429]);
      const limited = await post({ event: "e", distinctId: "u" }, auth);
      expect(limited.headers.get("retry-after")).toBeTruthy();
      expect(await db.event.count()).toBe(3);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("isolates projects: events land only in the key's project", async () => {
    const a = await setup();
    const b = await setup();
    await post({ event: "e", distinctId: "u" }, { authorization: `Bearer ${a.key.publicKey}` });
    expect(await db.event.count({ where: { projectId: a.project.id } })).toBe(1);
    expect(await db.event.count({ where: { projectId: b.project.id } })).toBe(0);
  });

  it("answers CORS preflight", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-headers")).toContain("Authorization");
  });
});
