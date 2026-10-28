import "server-only";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/mail";
import { parseFilters, parseTimeRange, type AnalyticsFilters, type TimeRange } from "./filters";
import type { FilterBarProps } from "./components/filter-bar";

export type SearchParams = Record<string, string | string[] | undefined>;

export function analyticsParams(searchParams: SearchParams): {
  range: TimeRange;
  filters: AnalyticsFilters;
  filterRange: FilterBarProps["range"];
} {
  const range = parseTimeRange(searchParams);
  const filters = parseFilters(searchParams);
  return {
    range,
    filters,
    filterRange: { preset: range.preset, label: range.label, from: range.from.toISOString(), to: range.to.toISOString() },
  };
}

export async function projectHasEvents(projectId: string): Promise<boolean> {
  const row = await db.event.findFirst({ where: { projectId }, select: { id: true } });
  return row !== null;
}

export const ingestEndpoint = () => appUrl("/api/v1/events");
