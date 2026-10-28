import type { Bucket } from "../filters";

const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts });

const TICK: Record<Bucket, Intl.DateTimeFormat> = {
  minute: fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  hour: fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  day: fmt({ month: "short", day: "numeric" }),
};

const FULL: Record<Bucket, Intl.DateTimeFormat> = {
  minute: fmt({ month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  hour: fmt({ weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  day: fmt({ weekday: "short", month: "short", day: "numeric", year: "numeric" }),
};

/** Buckets are UTC; label them in UTC so axis, tooltip and table agree. */
export const formatTick = (iso: string, bucket: Bucket) => TICK[bucket].format(new Date(iso));
export const formatBucket = (iso: string, bucket: Bucket) => `${FULL[bucket].format(new Date(iso))}${bucket === "day" ? "" : " UTC"}`;
