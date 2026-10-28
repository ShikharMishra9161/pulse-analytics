"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCompact, formatNumber } from "@/lib/format";
import type { Bucket } from "../filters";
import { formatBucket, formatTick } from "./chart-format";

export type Series<K extends string> = {
  key: K;
  label: string;
  /** CSS color, normally a categorical chart token, e.g. "var(--chart-1)". */
  color: string;
};

type Point<K extends string> = { bucket: string } & Record<K, number>;

/**
 * A single-measure-per-axis time series. Extra `tooltipOnly` series are shown in
 * the readout but not plotted (e.g. "new users" alongside cumulative users) —
 * never a second y-axis.
 */
export function TimeseriesChart<K extends string>({
  data,
  series,
  tooltipOnly = [],
  bucket,
  kind = "area",
  height = 260,
}: {
  data: Point<K>[];
  series: Series<K>[];
  tooltipOnly?: Series<K>[];
  bucket: Bucket;
  kind?: "area" | "bar";
  height?: number;
}) {
  const config = Object.fromEntries(series.map((s) => [s.key, { label: s.label, color: s.color }])) satisfies ChartConfig;
  const readout = [...series, ...tooltipOnly];

  const axes = (
    <>
      <CartesianGrid vertical={false} strokeDasharray="0" stroke="var(--border)" strokeOpacity={0.6} />
      <XAxis
        dataKey="bucket"
        tickLine={false}
        axisLine={false}
        tickMargin={8}
        minTickGap={32}
        tickFormatter={(v: string) => formatTick(v, bucket)}
        className="text-xs"
      />
      <YAxis
        tickLine={false}
        axisLine={false}
        width={44}
        allowDecimals={false}
        tickFormatter={(v: number) => formatCompact(v)}
        className="text-xs"
      />
      <Tooltip
        cursor={kind === "area" ? { stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" } : { fill: "var(--muted)", opacity: 0.6 }}
        content={({ active, payload }) => <SeriesTooltip active={active} payload={payload} series={readout} bucket={bucket} />}
      />
    </>
  );

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      {kind === "area" ? (
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.22} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          {axes}
          {series.map((s) => (
            <Area
              key={s.key}
              dataKey={s.key}
              name={s.label}
              type="monotone"
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#fill-${s.key})`}
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--background)" }}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      ) : (
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
          {axes}
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          ))}
        </BarChart>
      )}
    </ChartContainer>
  );
}

function SeriesTooltip<K extends string>({
  active,
  payload,
  series,
  bucket,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: unknown }>;
  series: Series<K>[];
  bucket: Bucket;
}) {
  const point = payload?.[0]?.payload as Point<K> | undefined;
  if (!active || !point) return null;
  return (
    <div className="min-w-40 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="mb-1.5 text-muted-foreground">{formatBucket(point.bucket, bucket)}</div>
      <div className="space-y-1">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} aria-hidden />
            <span className="tabular font-semibold text-foreground">{formatNumber(point[s.key])}</span>
            <span className="text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TimeseriesTable<K extends string>({
  data,
  series,
  bucket,
}: {
  data: Point<K>[];
  series: Series<K>[];
  bucket: Bucket;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{bucket === "day" ? "Date" : "Time"}</TableHead>
          {series.map((s) => (
            <TableHead key={s.key} className="text-right">
              {s.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...data].reverse().map((p) => (
          <TableRow key={p.bucket}>
            <TableCell className="text-muted-foreground">{formatBucket(p.bucket, bucket)}</TableCell>
            {series.map((s) => (
              <TableCell key={s.key} className="tabular text-right">
                {formatNumber(p[s.key])}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
