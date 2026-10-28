import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix epoch (ms) when the current window resets. */
  reset: number;
};

export type RateLimitConfig = {
  /** Namespace, e.g. "ingest" or "login". */
  prefix: string;
  limit: number;
  windowSeconds: number;
};

interface Limiter {
  limit(key: string): Promise<RateLimitResult>;
}

// ─── In-memory fixed window (single instance / local dev only) ───────────────

const MAX_MEMORY_KEYS = 50_000;

class MemoryLimiter implements Limiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly config: RateLimitConfig) {}

  async limit(key: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowMs = this.config.windowSeconds * 1000;
    let entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      if (this.hits.size >= MAX_MEMORY_KEYS) this.evictExpired(now);
      entry = { count: 0, resetAt: now + windowMs };
      this.hits.set(key, entry);
    }
    entry.count += 1;
    return {
      success: entry.count <= this.config.limit,
      limit: this.config.limit,
      remaining: Math.max(0, this.config.limit - entry.count),
      reset: entry.resetAt,
    };
  }

  private evictExpired(now: number) {
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
    // Still full of live keys: drop the oldest insertions rather than grow unbounded.
    if (this.hits.size >= MAX_MEMORY_KEYS) {
      const excess = this.hits.size - MAX_MEMORY_KEYS + 1000;
      let i = 0;
      for (const k of this.hits.keys()) {
        if (i++ >= excess) break;
        this.hits.delete(k);
      }
    }
  }
}

// ─── Upstash Redis sliding window (multi-instance safe) ──────────────────────

class UpstashLimiter implements Limiter {
  private readonly ratelimit: Ratelimit;

  constructor(redis: Redis, config: RateLimitConfig) {
    this.ratelimit = new Ratelimit({
      redis,
      prefix: `rl:${config.prefix}`,
      limiter: Ratelimit.slidingWindow(config.limit, `${config.windowSeconds} s`),
      analytics: false,
    });
  }

  async limit(key: string): Promise<RateLimitResult> {
    const { success, limit, remaining, reset } = await this.ratelimit.limit(key);
    return { success, limit, remaining, reset };
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

let redis: Redis | null | undefined;
function getRedis(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redis = url && token ? new Redis({ url, token }) : null;
  if (!redis && process.env.NODE_ENV === "production") {
    console.warn("[rate-limit] UPSTASH_REDIS_* not set — using per-instance in-memory rate limiting.");
  }
  return redis;
}

const limiters = new Map<string, Limiter>();

function getLimiter(config: RateLimitConfig): Limiter {
  const id = `${config.prefix}:${config.limit}:${config.windowSeconds}`;
  let limiter = limiters.get(id);
  if (!limiter) {
    const r = getRedis();
    limiter = r ? new UpstashLimiter(r, config) : new MemoryLimiter(config);
    limiters.set(id, limiter);
  }
  return limiter;
}

/**
 * Consumes one request for `key`. Fails open if the backing store is unavailable:
 * an outage of the limiter should not take down ingestion or sign-in.
 */
export async function rateLimit(config: RateLimitConfig, key: string): Promise<RateLimitResult> {
  try {
    return await getLimiter(config).limit(key);
  } catch (err) {
    console.error("[rate-limit] limiter unavailable, failing open", err);
    return { success: true, limit: config.limit, remaining: config.limit, reset: Date.now() };
  }
}

export function rateLimitHeaders(r: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(r.limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(Math.ceil(r.reset / 1000)),
  };
  if (!r.success) headers["Retry-After"] = String(Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)));
  return headers;
}

// ─── Shared policies ─────────────────────────────────────────────────────────

export const RATE_LIMITS = {
  login: { prefix: "login", limit: 10, windowSeconds: 60 * 5 },
  register: { prefix: "register", limit: 5, windowSeconds: 60 * 10 },
  verifyEmail: { prefix: "verify", limit: 10, windowSeconds: 60 * 10 },
  invite: { prefix: "invite", limit: 30, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitConfig>;

export function ingestRateLimit(): RateLimitConfig {
  return {
    prefix: "ingest",
    limit: Number(process.env.INGEST_RATE_LIMIT_PER_MINUTE) || 600,
    windowSeconds: 60,
  };
}
