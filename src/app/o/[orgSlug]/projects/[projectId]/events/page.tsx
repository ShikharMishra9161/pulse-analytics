import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ListTree } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalyticsContent, AnalyticsFrame } from "@/features/analytics/components/analytics-frame";
import { BreakdownCard } from "@/features/analytics/components/breakdown-card";
import { EventsTable } from "@/features/analytics/components/events-table";
import { FilterBar } from "@/features/analytics/components/filter-bar";
import { EventsOverTimeCard } from "@/features/analytics/components/overview-charts";
import { analyticsParams, type SearchParams } from "@/features/analytics/page-params";
import {
  decodeCursor,
  getEventNames,
  getEventsTimeseries,
  getPropertyBreakdown,
  getPropertyKeys,
  listEvents,
} from "@/features/analytics/queries";
import { requireProjectPage } from "@/server/access";

export const metadata: Metadata = { title: "Events" };

const PREFERRED_BREAKDOWNS = ["path", "country", "browser", "plan", "device"];

export default async function EventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { orgSlug, projectId } = await params;
  await requireProjectPage(orgSlug, projectId);
  const sp = await searchParams;
  const { range, filters, filterRange } = analyticsParams(sp);
  const cursorParam = typeof sp.cursor === "string" ? sp.cursor : undefined;
  const cursor = decodeCursor(cursorParam);

  const [eventNames, propertyKeys, timeseries, page] = await Promise.all([
    getEventNames(projectId, range),
    getPropertyKeys(projectId),
    getEventsTimeseries(projectId, range, filters),
    listEvents(projectId, range, filters, { cursor, limit: 50 }),
  ]);

  const requested = typeof sp.breakdown === "string" ? sp.breakdown : undefined;
  const breakdownKey =
    (requested && propertyKeys.includes(requested) ? requested : undefined) ??
    PREFERRED_BREAKDOWNS.find((k) => propertyKeys.includes(k)) ??
    propertyKeys[0] ??
    null;
  const breakdown = breakdownKey ? await getPropertyBreakdown(projectId, range, filters, breakdownKey) : [];

  const qs = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string") next.set(k, v);
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    return `?${next}`;
  };

  return (
    <AnalyticsFrame>
      <div className="space-y-6">
        <PageHeader title="Events" description="Explore raw events and slice them by name and properties." />
        <FilterBar range={filterRange} filters={filters} eventNames={eventNames} propertyKeys={propertyKeys} />
        <AnalyticsContent className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <EventsOverTimeCard data={timeseries} bucket={range.bucket} />
            <BreakdownCard propertyKeys={propertyKeys} selectedKey={breakdownKey} values={breakdown} />
          </div>

          <Card className="gap-0 pb-0">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">Event stream</CardTitle>
              <CardDescription>Newest first · click a row to inspect its properties</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {page.items.length === 0 ? (
                <EmptyState
                  icon={ListTree}
                  title="No matching events"
                  description="Nothing matches these filters in the selected time range."
                  className="m-6"
                />
              ) : (
                <EventsTable events={page.items} />
              )}
            </CardContent>
            {(cursor || page.nextCursor) && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                {cursor ? (
                  <Button asChild variant="ghost" size="sm">
                    <Link href={qs({ cursor: null })} scroll={false}>
                      Back to newest
                    </Link>
                  </Button>
                ) : (
                  <span />
                )}
                {page.nextCursor && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={qs({ cursor: page.nextCursor })} scroll={false}>
                      Older events <ArrowRight />
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </Card>
        </AnalyticsContent>
      </div>
    </AnalyticsFrame>
  );
}
