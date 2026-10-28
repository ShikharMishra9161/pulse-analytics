import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsContent, AnalyticsFrame } from "@/features/analytics/components/analytics-frame";
import { BarList } from "@/features/analytics/components/bar-list";
import { FilterBar } from "@/features/analytics/components/filter-bar";
import { GettingStarted } from "@/features/analytics/components/getting-started";
import { EventsOverTimeCard, UserGrowthCard } from "@/features/analytics/components/overview-charts";
import { StatCards, StatCardsSkeleton } from "@/features/analytics/components/stat-cards";
import type { AnalyticsFilters, TimeRange } from "@/features/analytics/filters";
import { analyticsParams, ingestEndpoint, projectHasEvents, type SearchParams } from "@/features/analytics/page-params";
import {
  getEventNames,
  getEventsTimeseries,
  getOverviewMetrics,
  getPropertyKeys,
  getTopEvents,
  getUserGrowth,
} from "@/features/analytics/queries";
import { can } from "@/lib/permissions";
import { requireProjectPage } from "@/server/access";

export const metadata: Metadata = { title: "Overview" };

type Props = {
  params: Promise<{ orgSlug: string; projectId: string }>;
  searchParams: Promise<SearchParams>;
};

export default async function ProjectOverviewPage({ params, searchParams }: Props) {
  const { orgSlug, projectId } = await params;
  const ctx = await requireProjectPage(orgSlug, projectId);
  const sp = await searchParams;
  const { range, filters, filterRange } = analyticsParams(sp);
  const base = `/o/${orgSlug}/projects/${projectId}`;

  if (!(await projectHasEvents(projectId))) {
    return (
      <div className="space-y-6">
        <PageHeader title={ctx.project.name} description={ctx.project.description ?? "Project overview"} />
        <GettingStarted endpoint={ingestEndpoint()} apiKeysHref={`${base}/api-keys`} canManageKeys={can(ctx.role, "apikey:create")} />
      </div>
    );
  }

  const [eventNames, propertyKeys] = await Promise.all([getEventNames(projectId, range), getPropertyKeys(projectId)]);


  return (
    <AnalyticsFrame>
      <div className="space-y-6">
        <PageHeader title={ctx.project.name} description={ctx.project.description ?? "Project overview"} />
        <FilterBar range={filterRange} filters={filters} eventNames={eventNames} propertyKeys={propertyKeys} />
        <AnalyticsContent className="space-y-6">
          <Suspense fallback={<StatCardsSkeleton />}>
            <Stats projectId={projectId} range={range} filters={filters} />
          </Suspense>
          <Suspense fallback={<ChartSkeleton height={280} />}>
            <EventsChart projectId={projectId} range={range} filters={filters} />
          </Suspense>
          <div className="grid gap-6 lg:grid-cols-2">
            <Suspense fallback={<ChartSkeleton height={240} />}>
              <UsersChart projectId={projectId} range={range} />
            </Suspense>
            <Suspense fallback={<ChartSkeleton height={240} />}>
              <TopEvents projectId={projectId} range={range} filters={filters} base={base} sp={sp} />
            </Suspense>
          </div>
        </AnalyticsContent>
      </div>
    </AnalyticsFrame>
  );
}

type SectionProps = { projectId: string; range: TimeRange; filters: AnalyticsFilters };

async function Stats({ projectId, range, filters }: SectionProps) {
  return <StatCards metrics={await getOverviewMetrics(projectId, range, filters)} />;
}

async function EventsChart({ projectId, range, filters }: SectionProps) {
  return <EventsOverTimeCard data={await getEventsTimeseries(projectId, range, filters)} bucket={range.bucket} />;
}

async function UsersChart({ projectId, range }: { projectId: string; range: TimeRange }) {
  return <UserGrowthCard data={await getUserGrowth(projectId, range)} bucket={range.bucket} />;
}

async function TopEvents({ projectId, range, filters, base, sp }: SectionProps & { base: string; sp: SearchParams }) {
  const top = await getTopEvents(projectId, range, filters, 8);
  const hrefFor = (name: string) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string") next.set(k, v);
    next.set("event", name);
    return `${base}/events?${next}`;
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top events</CardTitle>
        <CardDescription>
          By volume · <Link href={`${base}/events`} className="underline-offset-4 hover:underline">explore all</Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {top.length === 0 ? (
          <EmptyState icon={BarChart3} title="No events in this range" description="Try a wider time range or remove filters." className="py-8" />
        ) : (
          <BarList
            valueLabel="Events"
            items={top.map((e) => ({ label: e.name, value: e.count, secondary: `${e.users.toLocaleString()} users`, href: hrefFor(e.name) }))}
          />
        )}
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ height }: { height: number }) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full" style={{ height }} />
      </CardContent>
    </Card>
  );
}
