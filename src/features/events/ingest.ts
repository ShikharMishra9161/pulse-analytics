import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { IncomingEvent } from "./schemas";

/**
 * Writes a batch of validated events in one transaction:
 *   1. a single multi-row INSERT into `events`
 *   2. a single upsert into `project_users` (first/last seen per distinctId)
 */
export async function ingestEvents(projectId: string, events: IncomingEvent[]): Promise<{ accepted: number }> {
  if (events.length === 0) return { accepted: 0 };
  const receivedAt = new Date();

  const rows: Prisma.EventCreateManyInput[] = events.map((e) => ({
    projectId,
    name: e.event,
    distinctId: e.distinctId,
    timestamp: e.timestamp ?? receivedAt,
    receivedAt,
    properties: e.properties as Prisma.InputJsonObject,
  }));

  // Collapse to one row per user — ON CONFLICT can't touch the same row twice per statement.
  const users = new Map<string, { first: Date; last: Date }>();
  for (const row of rows) {
    const ts = row.timestamp as Date;
    const u = users.get(row.distinctId);
    if (!u) users.set(row.distinctId, { first: ts, last: ts });
    else {
      if (ts < u.first) u.first = ts;
      if (ts > u.last) u.last = ts;
    }
  }
  // Stable ordering avoids deadlocks between concurrent batches touching the same users.
  const ids = [...users.keys()].sort();
  const firsts = ids.map((id) => users.get(id)!.first.toISOString());
  const lasts = ids.map((id) => users.get(id)!.last.toISOString());

  await db.$transaction([
    db.event.createMany({ data: rows }),
    db.$executeRaw`
      INSERT INTO project_users ("projectId", "distinctId", "firstSeenAt", "lastSeenAt")
      SELECT ${projectId}, u.distinct_id, u.first_seen, u.last_seen
      FROM unnest(${ids}::text[], ${firsts}::timestamptz[], ${lasts}::timestamptz[])
        AS u(distinct_id, first_seen, last_seen)
      ON CONFLICT ("projectId", "distinctId") DO UPDATE SET
        "firstSeenAt" = LEAST(project_users."firstSeenAt", EXCLUDED."firstSeenAt"),
        "lastSeenAt"  = GREATEST(project_users."lastSeenAt", EXCLUDED."lastSeenAt")`,
  ]);

  return { accepted: rows.length };
}
