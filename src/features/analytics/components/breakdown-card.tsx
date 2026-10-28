"use client";

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCompact, formatNumber } from "@/lib/format";
import type { PropertyValueCount } from "../queries";
import { useAnalyticsFrame } from "./analytics-frame";

export function BreakdownCard({
  propertyKeys,
  selectedKey,
  values,
}: {
  propertyKeys: string[];
  selectedKey: string | null;
  values: PropertyValueCount[];
}) {
  const { setParams } = useAnalyticsFrame();
  const max = Math.max(1, ...values.map((v) => v.count));
  const total = values.reduce((s, v) => s + v.count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Breakdown</CardTitle>
        <CardDescription>Top values · click to filter</CardDescription>
        {propertyKeys.length > 0 && (
          <CardAction>
            <Select value={selectedKey ?? undefined} onValueChange={(v) => setParams({ breakdown: v })}>
              <SelectTrigger size="sm" className="w-36" aria-label="Break down by property">
                <SelectValue placeholder="Property" />
              </SelectTrigger>
              <SelectContent>
                {propertyKeys.map((k) => (
                  <SelectItem key={k} value={k}>
                    <span className="font-mono text-xs">{k}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {!selectedKey || values.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {propertyKeys.length === 0 ? "No properties recorded yet." : "No values for this property in the current slice."}
          </p>
        ) : (
          <ul className="space-y-1">
            {values.map((v) => (
              <li key={v.value}>
                <button
                  type="button"
                  onClick={() => setParams({ prop: selectedKey, val: v.value })}
                  className="group relative flex h-8 w-full items-center justify-between gap-3 rounded-md px-2 text-left hover:bg-muted/50"
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 rounded-md bg-chart-1/15 group-hover:bg-chart-1/25"
                    style={{ width: `${Math.max(2, (v.count / max) * 100)}%` }}
                  />
                  <span className="relative truncate text-sm">{v.value}</span>
                  <span className="relative flex items-baseline gap-2">
                    <span className="text-xs text-muted-foreground">{((v.count / total) * 100).toFixed(0)}%</span>
                    <span className="tabular text-sm font-medium" title={formatNumber(v.count)}>
                      {formatCompact(v.count)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
