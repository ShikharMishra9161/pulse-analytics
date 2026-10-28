import { formatDistanceToNowStrict } from "date-fns";

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const full = new Intl.NumberFormat("en-US");

export const formatNumber = (n: number) => full.format(n);
export const formatCompact = (n: number) => (Math.abs(n) < 10_000 ? full.format(Math.round(n)) : compact.format(n));

export function formatRelative(date: Date | string | null | undefined, fallback = "Never"): string {
  if (!date) return fallback;
  return `${formatDistanceToNowStrict(new Date(date))} ago`;
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(date));
}

/** Percentage change, or null when there's no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
