import { z } from "zod";

/** Isomorphic: used by server queries and by the client filter bar. */

export const RANGE_PRESETS = {
  "24h": { label: "Last 24 hours", hours: 24 },
  "7d": { label: "Last 7 days", hours: 24 * 7 },
  "30d": { label: "Last 30 days", hours: 24 * 30 },
  "90d": { label: "Last 90 days", hours: 24 * 90 },
} as const;

export type RangePreset = keyof typeof RANGE_PRESETS;
export type Bucket = "minute" | "hour" | "day";

export type TimeRange = {
  preset: RangePreset | "custom";
  from: Date;
  to: Date;
  bucket: Bucket;
  label: string;
};

export type AnalyticsFilters = {
  event?: string;
  property?: { key: string; value: string };
};

const MAX_CUSTOM_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function utcDay(value: string): Date | null {
  if (!dateOnly.safeParse(value).success) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toDateParam(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseTimeRange(params: SearchParams, now = new Date()): TimeRange {
  const range = one(params.range);

  if (range === "custom") {
    const from = utcDay(one(params.from) ?? "");
    const toDay = utcDay(one(params.to) ?? "");
    if (from && toDay && toDay >= from) {
      // `to` is inclusive in the UI → exclusive end-of-day bound in queries.
      let to = new Date(toDay.getTime() + DAY_MS);
      if (to.getTime() - from.getTime() > MAX_CUSTOM_DAYS * DAY_MS) to = new Date(from.getTime() + MAX_CUSTOM_DAYS * DAY_MS);
      if (to > now) to = now;
      const span = to.getTime() - from.getTime();
      return {
        preset: "custom",
        from,
        to,
        bucket: span <= 2 * DAY_MS ? "hour" : "day",
        label: `${toDateParam(from)} → ${toDateParam(toDay)}`,
      };
    }
  }

  const preset: RangePreset = range && range in RANGE_PRESETS ? (range as RangePreset) : "7d";
  const { hours, label } = RANGE_PRESETS[preset];
  return {
    preset,
    from: new Date(now.getTime() - hours * 60 * 60 * 1000),
    to: now,
    bucket: hours <= 48 ? "hour" : "day",
    label,
  };
}

/** The equally long window immediately before `range`, for period-over-period deltas. */
export function previousRange(range: TimeRange): { from: Date; to: Date } {
  const span = range.to.getTime() - range.from.getTime();
  return { from: new Date(range.from.getTime() - span), to: range.from };
}

const filterValue = z.string().trim().min(1).max(200);

export function parseFilters(params: SearchParams): AnalyticsFilters {
  const event = filterValue.safeParse(one(params.event));
  const key = filterValue.safeParse(one(params.prop));
  const value = filterValue.safeParse(one(params.val));
  return {
    event: event.success ? event.data : undefined,
    property: key.success && value.success ? { key: key.data, value: value.data } : undefined,
  };
}
