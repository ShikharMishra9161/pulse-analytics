"use client";

import type { Bucket } from "../filters";
import type { TimeseriesPoint, UserGrowthPoint } from "../queries";
import { ChartCard } from "./chart-card";
import { TimeseriesChart, TimeseriesTable, type Series } from "./timeseries-chart";

const EVENTS_SERIES: Series<"events">[] = [{ key: "events", label: "Events", color: "var(--chart-1)" }];
const EVENTS_READOUT: Series<"events" | "users">[] = [{ key: "users", label: "Unique users", color: "var(--muted-foreground)" }];

export function EventsOverTimeCard({ data, bucket }: { data: TimeseriesPoint[]; bucket: Bucket }) {
  return (
    <ChartCard
      title="Events over time"
      description={`Per ${bucket} · UTC`}
      chart={<TimeseriesChart data={data} series={EVENTS_SERIES} tooltipOnly={EVENTS_READOUT} bucket={bucket} height={280} />}
      table={<TimeseriesTable data={data} series={[...EVENTS_SERIES, ...EVENTS_READOUT]} bucket={bucket} />}
    />
  );
}

const USERS_SERIES: Series<"totalUsers">[] = [{ key: "totalUsers", label: "Total users", color: "var(--chart-3)" }];
const USERS_READOUT: Series<"totalUsers" | "newUsers">[] = [{ key: "newUsers", label: "New users", color: "var(--muted-foreground)" }];

export function UserGrowthCard({ data, bucket }: { data: UserGrowthPoint[]; bucket: Bucket }) {
  return (
    <ChartCard
      title="User growth"
      description="Cumulative users by first seen date"
      chart={<TimeseriesChart data={data} series={USERS_SERIES} tooltipOnly={USERS_READOUT} bucket={bucket} height={240} />}
      table={<TimeseriesTable data={data} series={[...USERS_SERIES, ...USERS_READOUT]} bucket={bucket} />}
    />
  );
}
