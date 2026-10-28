"use client";

import { formatDateTime, formatRelative } from "@/lib/format";

/**
 * Relative time inside client components. Server and browser clocks/time zones
 * differ by design, so the text is allowed to differ at hydration.
 */
export function TimeAgo({ date, className }: { date: string | Date; className?: string }) {
  const iso = new Date(date).toISOString();
  return (
    <time dateTime={iso} title={formatDateTime(iso)} className={className} suppressHydrationWarning>
      {formatRelative(iso)}
    </time>
  );
}
