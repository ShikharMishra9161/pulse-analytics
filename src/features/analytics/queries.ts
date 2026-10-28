import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { previousRange, type AnalyticsFilters, type Bucket, type TimeRange } from "./filters";

/**
 * All aggregation happens in Postgres (COUNT / GROUP BY / generate_series) and
 * every query is bounded by (projectId, timestamp) so it can use the composite
 * indexes on `events`. Values are always bound parameters — never interpolated.
 */

const BUCKET_INTERVAL: Record<Bucket, string> = { minute: "1 minute", hour: "1 hour", day: "1 day" };

/** Candidate JSON encodings of a filter value: "42" may be stored as the string "42" or the number 42. */
function propertyCandidates(key: string, value: string): string[] {
  const candidates: unknown[] = [value];
  if (value === "true" || value === "false") candidates.push(value === "true");
  if (value === "null") candidates.push(null);
  if (/^-?\d+(\.\d+)?$/.test(value) && Number.isFinite(Number(value))) candidates.push(Number(value));
  return candidates.map((v) => JSON.stringify({ [key]: v }));
}

function eventWhere(projectId: string, from: Date, to: Date, filters: AnalyticsFilters = {}): Prisma.Sql {
  const clauses: Prisma.Sql[] = [
    Prisma.sql`"projectId" = ${projectId}`,
    Prisma.sql`"timestamp" >= ${from}`,
    Prisma.sql`"timestamp" < ${to}`,
  ];
  if (filters.event) clauses.push(Prisma.sql`"name" = ${filters.event}`);
  if (filters.property) {
    // `@>` containment uses the GIN (jsonb_path_ops) index.
    const ors = propertyCandidates(filters.property.key, filters.property.value).map(
      (json) => Prisma.sql`"properties" @> ${json}::jsonb`,
    );
    clauses.push(Prisma.sql`(${Prisma.join(ors, " OR ")})`);
  }
  return Prisma.join(clauses, " AND ");
}

// ─── Overview ────────────────────────────────────────────────────────────────

export type OverviewMetrics = {
  totalEvents: number;
  uniqueUsers: number;
  newUsers: number;
  eventsPerUser: number;
  previous: { totalEvents: number; uniqueUsers: number; newUsers: number; eventsPerUser: number };
};

async function countEvents(projectId: string, from: Date, to: Date, filters: AnalyticsFilters) {
  const [row] = await db.$queryRaw<{ events: bigint; users: bigint }[]>`
    SELECT COUNT(*)::bigint AS events, COUNT(DISTINCT "distinctId")::bigint AS users
    FROM events WHERE ${eventWhere(projectId, from, to, filters)}`;
  return { events: Number(row?.events ?? 0), users: Number(row?.users ?? 0) };
}

async function countNewUsers(projectId: string, from: Date, to: Date) {
  return db.projectUser.count({ where: { projectId, firstSeenAt: { gte: from, lt: to } } });
}

export async function getOverviewMetrics(
  projectId: string,
  range: TimeRange,
  filters: AnalyticsFilters,
): Promise<OverviewMetrics> {
  const prev = previousRange(range);
  const [cur, before, newUsers, prevNewUsers] = await Promise.all([
    countEvents(projectId, range.from, range.to, filters),
    countEvents(projectId, prev.from, prev.to, filters),
    countNewUsers(projectId, range.from, range.to),
    countNewUsers(projectId, prev.from, prev.to),
  ]);
  const ratio = (e: number, u: number) => (u === 0 ? 0 : e / u);
  return {
    totalEvents: cur.events,
    uniqueUsers: cur.users,
    newUsers,
    eventsPerUser: ratio(cur.events, cur.users),
    previous: {
      totalEvents: before.events,
      uniqueUsers: before.users,
      newUsers: prevNewUsers,
      eventsPerUser: ratio(before.events, before.users),
    },
  };
}

// ─── Time series ─────────────────────────────────────────────────────────────

export type TimeseriesPoint = { bucket: string; events: number; users: number };

export async function getEventsTimeseries(
  projectId: string,
  range: TimeRange,
  filters: AnalyticsFilters,
): Promise<TimeseriesPoint[]> {
  const unit = range.bucket;
  const step = BUCKET_INTERVAL[unit];
  const rows = await db.$queryRaw<{ bucket: Date; events: bigint; users: bigint }[]>`
    WITH buckets AS (
      SELECT generate_series(
        date_trunc(${unit}, ${range.from}::timestamptz AT TIME ZONE 'UTC'),
        date_trunc(${unit}, ${range.to}::timestamptz AT TIME ZONE 'UTC'),
        ${step}::interval
      ) AS bucket
    ),
    agg AS (
      SELECT date_trunc(${unit}, "timestamp" AT TIME ZONE 'UTC') AS bucket,
             COUNT(*)::bigint AS events,
             COUNT(DISTINCT "distinctId")::bigint AS users
      FROM events
      WHERE ${eventWhere(projectId, range.from, range.to, filters)}
      GROUP BY 1
    )
    SELECT b.bucket, COALESCE(a.events, 0)::bigint AS events, COALESCE(a.users, 0)::bigint AS users
    FROM buckets b LEFT JOIN agg a USING (bucket)
    ORDER BY b.bucket`;
  return rows.map((r) => ({ bucket: asUtc(r.bucket), events: Number(r.events), users: Number(r.users) }));
}

export type UserGrowthPoint = { bucket: string; newUsers: number; totalUsers: number };

export async function getUserGrowth(projectId: string, range: TimeRange): Promise<UserGrowthPoint[]> {
  const unit = range.bucket;
  const step = BUCKET_INTERVAL[unit];
  const [baseline, rows] = await Promise.all([
    db.projectUser.count({ where: { projectId, firstSeenAt: { lt: range.from } } }),
    db.$queryRaw<{ bucket: Date; new_users: bigint }[]>`
      WITH buckets AS (
        SELECT generate_series(
          date_trunc(${unit}, ${range.from}::timestamptz AT TIME ZONE 'UTC'),
          date_trunc(${unit}, ${range.to}::timestamptz AT TIME ZONE 'UTC'),
          ${step}::interval
        ) AS bucket
      ),
      agg AS (
        SELECT date_trunc(${unit}, "firstSeenAt" AT TIME ZONE 'UTC') AS bucket, COUNT(*)::bigint AS new_users
        FROM project_users
        WHERE "projectId" = ${projectId} AND "firstSeenAt" >= ${range.from} AND "firstSeenAt" < ${range.to}
        GROUP BY 1
      )
      SELECT b.bucket, COALESCE(a.new_users, 0)::bigint AS new_users
      FROM buckets b LEFT JOIN agg a USING (bucket)
      ORDER BY b.bucket`,
  ]);
  let running = baseline;
  return rows.map((r) => {
    const newUsers = Number(r.new_users);
    running += newUsers;
    return { bucket: asUtc(r.bucket), newUsers, totalUsers: running };
  });
}

// ─── Breakdowns ──────────────────────────────────────────────────────────────

export type TopEvent = { name: string; count: number; users: number };

export async function getTopEvents(
  projectId: string,
  range: TimeRange,
  filters: AnalyticsFilters,
  limit = 10,
): Promise<TopEvent[]> {
  const rows = await db.$queryRaw<{ name: string; count: bigint; users: bigint }[]>`
    SELECT "name", COUNT(*)::bigint AS count, COUNT(DISTINCT "distinctId")::bigint AS users
    FROM events
    WHERE ${eventWhere(projectId, range.from, range.to, filters)}
    GROUP BY "name"
    ORDER BY count DESC, "name" ASC
    LIMIT ${limit}`;
  return rows.map((r) => ({ name: r.name, count: Number(r.count), users: Number(r.users) }));
}

export type PropertyValueCount = { value: string; count: number };

export async function getPropertyBreakdown(
  projectId: string,
  range: TimeRange,
  filters: AnalyticsFilters,
  key: string,
  limit = 10,
): Promise<PropertyValueCount[]> {
  const rows = await db.$queryRaw<{ value: string | null; count: bigint }[]>`
    SELECT "properties" ->> ${key} AS value, COUNT(*)::bigint AS count
    FROM events
    WHERE ${eventWhere(projectId, range.from, range.to, filters)} AND "properties" ? ${key}
    GROUP BY 1
    ORDER BY count DESC
    LIMIT ${limit}`;
  return rows.map((r) => ({ value: r.value ?? "(null)", count: Number(r.count) }));
}

// ─── Filter options ──────────────────────────────────────────────────────────

export async function getEventNames(projectId: string, range: TimeRange, limit = 200): Promise<string[]> {
  const rows = await db.$queryRaw<{ name: string }[]>`
    SELECT "name" FROM events
    WHERE ${eventWhere(projectId, range.from, range.to)}
    GROUP BY "name" ORDER BY COUNT(*) DESC LIMIT ${limit}`;
  return rows.map((r) => r.name);
}

/** Property keys sampled from the most recent events (cheap; exact key catalogs belong in a side table). */
export async function getPropertyKeys(projectId: string, sample = 1000): Promise<string[]> {
  const rows = await db.$queryRaw<{ key: string }[]>`
    SELECT DISTINCT jsonb_object_keys("properties") AS key
    FROM (
      SELECT "properties" FROM events
      WHERE "projectId" = ${projectId}
      ORDER BY "timestamp" DESC
      LIMIT ${sample}
    ) recent
    ORDER BY key
    LIMIT 100`;
  return rows.map((r) => r.key);
}

// ─── Event explorer (keyset pagination) ──────────────────────────────────────

export type EventRow = {
  id: string;
  name: string;
  distinctId: string;
  timestamp: string;
  properties: Record<string, unknown>;
};

export type EventCursor = { ts: string; id: string };

export function encodeCursor(c: EventCursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

export function decodeCursor(raw: string | undefined): EventCursor | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (
      parsed &&
      typeof parsed === "object" &&
      "ts" in parsed &&
      "id" in parsed &&
      typeof parsed.ts === "string" &&
      typeof parsed.id === "string" &&
      !Number.isNaN(Date.parse(parsed.ts)) &&
      /^[0-9a-f-]{36}$/i.test(parsed.id)
    ) {
      return { ts: parsed.ts, id: parsed.id };
    }
  } catch {
    // fall through
  }
  return null;
}

export async function listEvents(
  projectId: string,
  range: TimeRange,
  filters: AnalyticsFilters,
  options: { cursor?: EventCursor | null; limit?: number } = {},
): Promise<{ items: EventRow[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
  const cursorClause = options.cursor
    ? Prisma.sql`AND ("timestamp", "id") < (${new Date(options.cursor.ts)}::timestamptz, ${options.cursor.id}::uuid)`
    : Prisma.empty;
  const rows = await db.$queryRaw<{ id: string; name: string; distinctId: string; timestamp: Date; properties: Prisma.JsonValue }[]>`
    SELECT "id", "name", "distinctId", "timestamp", "properties"
    FROM events
    WHERE ${eventWhere(projectId, range.from, range.to, filters)} ${cursorClause}
    ORDER BY "timestamp" DESC, "id" DESC
    LIMIT ${limit + 1}`;

  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  return {
    items: page.map((r) => ({
      id: r.id,
      name: r.name,
      distinctId: r.distinctId,
      timestamp: r.timestamp.toISOString(),
      properties: (r.properties && typeof r.properties === "object" && !Array.isArray(r.properties) ? r.properties : {}) as Record<string, unknown>,
    })),
    nextCursor: rows.length > limit && last ? encodeCursor({ ts: last.timestamp.toISOString(), id: last.id }) : null,
  };
}

// ─── Live ────────────────────────────────────────────────────────────────────

export type LiveSnapshot = {
  activeUsers: number;
  eventsLastHour: number;
  perMinute: { bucket: string; events: number }[];
  recent: EventRow[];
  generatedAt: string;
};

export async function getLiveSnapshot(projectId: string): Promise<LiveSnapshot> {
  const now = new Date();
  const fiveMinAgo = new Date(now.getTime() - 5 * 60_000);
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60_000);
  const hourAgo = new Date(now.getTime() - 60 * 60_000);
  const minuteRange: TimeRange = { preset: "custom", from: thirtyMinAgo, to: now, bucket: "minute", label: "" };

  const [active, lastHour, perMinute, recent] = await Promise.all([
    countEvents(projectId, fiveMinAgo, now, {}),
    countEvents(projectId, hourAgo, now, {}),
    getEventsTimeseries(projectId, minuteRange, {}),
    listEvents(projectId, { ...minuteRange, from: hourAgo }, {}, { limit: 25 }),
  ]);
  return {
    activeUsers: active.users,
    eventsLastHour: lastHour.events,
    perMinute: perMinute.map((p) => ({ bucket: p.bucket, events: p.events })),
    recent: recent.items,
    generatedAt: now.toISOString(),
  };
}

/** `timestamp without time zone` values come back as Dates in local time of the DB session (UTC). */
function asUtc(d: Date): string {
  return d.toISOString();
}
