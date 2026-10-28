import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompact, formatNumber, percentChange } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OverviewMetrics } from "../queries";

type Stat = { label: string; value: number; previous: number; format?: (n: number) => string; hint: string };

export function StatCards({ metrics }: { metrics: OverviewMetrics }) {
  const stats: Stat[] = [
    { label: "Total events", value: metrics.totalEvents, previous: metrics.previous.totalEvents, hint: "Events matching the current filters" },
    { label: "Unique users", value: metrics.uniqueUsers, previous: metrics.previous.uniqueUsers, hint: "Distinct distinctIds that sent a matching event" },
    { label: "New users", value: metrics.newUsers, previous: metrics.previous.newUsers, hint: "Users first seen in this period" },
    {
      label: "Events per user",
      value: metrics.eventsPerUser,
      previous: metrics.previous.eventsPerUser,
      format: (n) => n.toFixed(1),
      hint: "Average events per unique user",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <StatCard key={s.label} stat={s} />
      ))}
    </div>
  );
}

function StatCard({ stat }: { stat: Stat }) {
  const change = percentChange(stat.value, stat.previous);
  const format = stat.format ?? formatCompact;
  const direction = change === null || Math.abs(change) < 0.5 ? "flat" : change > 0 ? "up" : "down";
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <Card className="gap-0 py-4">
      <CardContent className="px-4">
        <p className="text-sm text-muted-foreground" title={stat.hint}>
          {stat.label}
        </p>
        <p className="tabular mt-1.5 text-2xl font-semibold tracking-tight" title={stat.format ? undefined : formatNumber(stat.value)}>
          {format(stat.value)}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              direction === "up" && "text-emerald-600 dark:text-emerald-400",
              direction === "down" && "text-rose-600 dark:text-rose-400",
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {change === null ? "New" : `${Math.abs(change).toFixed(1)}%`}
          </span>
          <span>vs previous period</span>
        </p>
      </CardContent>
    </Card>
  );
}

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i} className="gap-0 py-4">
          <CardContent className="space-y-2.5 px-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
