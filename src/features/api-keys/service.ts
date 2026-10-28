import "server-only";
import { db } from "@/lib/db";
import { notFound } from "@/lib/errors";
import { paginate, skipTake, type PageParams } from "@/lib/pagination";
import { generateKeyPair, hashSecret, parseKey } from "./keys";

export type ApiKeyListItem = {
  id: string;
  name: string;
  publicKey: string;
  secretPrefix: string;
  lastUsedAt: Date | null;
  requestCount: number;
  revokedAt: Date | null;
  createdAt: Date;
  createdBy: { name: string | null; email: string } | null;
};

export async function listApiKeys(projectId: string, params: PageParams) {
  const where = { projectId };
  const [rows, total] = await Promise.all([
    db.apiKey.findMany({
      where,
      // Active keys first, newest first.
      orderBy: [{ revokedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
      ...skipTake(params),
      select: {
        id: true,
        name: true,
        publicKey: true,
        secretPrefix: true,
        lastUsedAt: true,
        requestCount: true,
        revokedAt: true,
        createdAt: true,
        createdBy: { select: { name: true, email: true } },
      },
    }),
    db.apiKey.count({ where }),
  ]);
  const items: ApiKeyListItem[] = rows.map((r) => ({ ...r, requestCount: Number(r.requestCount) }));
  return paginate(items, total, params);
}

/** Creates a key pair. The raw secret is returned exactly once and never stored. */
export async function createApiKey(params: { projectId: string; name: string; createdById: string }) {
  const pair = generateKeyPair();
  const key = await db.apiKey.create({
    data: {
      projectId: params.projectId,
      name: params.name,
      publicKey: pair.publicKey,
      secretHash: pair.secretHash,
      secretPrefix: pair.secretPrefix,
      createdById: params.createdById,
    },
    select: { id: true, name: true, publicKey: true },
  });
  return { ...key, secretKey: pair.secretKey };
}

export async function revokeApiKey(projectId: string, apiKeyId: string) {
  const { count } = await db.apiKey.updateMany({
    where: { id: apiKeyId, projectId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) throw notFound("API key");
  invalidateKeyCache();
}

// ─── Ingestion-time key resolution ───────────────────────────────────────────

export type ResolvedKey = { id: string; projectId: string };

/**
 * Short-lived per-instance cache so hot ingestion paths don't hit Postgres for
 * every request. Revocation propagates within KEY_CACHE_TTL_MS (and immediately
 * on the instance that performed it).
 */
const KEY_CACHE_TTL_MS = 15_000;
const KEY_CACHE_MAX = 5_000;
const keyCache = new Map<string, { value: ResolvedKey | null; expiresAt: number }>();

export function invalidateKeyCache() {
  keyCache.clear();
}

export async function resolveApiKey(raw: string | null | undefined): Promise<ResolvedKey | null> {
  const parsed = parseKey(raw);
  if (!parsed) return null;

  const cacheKey = parsed.kind === "secret" ? `s:${hashSecret(parsed.value)}` : `p:${parsed.value}`;
  const cached = keyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const key = await db.apiKey.findUnique({
    where: parsed.kind === "secret" ? { secretHash: hashSecret(parsed.value) } : { publicKey: parsed.value },
    select: { id: true, projectId: true, revokedAt: true },
  });
  const value = key && !key.revokedAt ? { id: key.id, projectId: key.projectId } : null;

  if (keyCache.size >= KEY_CACHE_MAX) keyCache.clear();
  keyCache.set(cacheKey, { value, expiresAt: Date.now() + KEY_CACHE_TTL_MS });
  return value;
}

/** Usage tracking; called after the response is sent. */
export async function recordKeyUsage(apiKeyId: string) {
  await db.apiKey.update({
    where: { id: apiKeyId },
    data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
  });
}
