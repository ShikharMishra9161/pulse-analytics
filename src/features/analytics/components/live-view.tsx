"use client";

import { useEffect, useRef, useState } from "react";
import { Radio } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import type { Result } from "@/lib/result";
import type { LiveSnapshot } from "../queries";
import { EventsTable } from "./events-table";
import { TimeseriesChart, type Series } from "./timeseries-chart";

const POLL_MS = 5_000;
const SERIES: Series<"events">[] = [{ key: "events", label: "Events", color: "var(--chart-1)" }];

export function LiveView({ projectId, initial }: { projectId: string; initial: LiveSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [status, setStatus] = useState<"live" | "paused" | "error">("live");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function tick() {
      if (document.hidden) {
        setStatus("paused");
        schedule();
        return;
      }
      try {
        const res = await fetch(`/api/projects/${projectId}/live`, { cache: "no-store", signal: controller.signal });
        const body = (await res.json()) as Result<LiveSnapshot>;
        if (cancelled) return;
        if (body.ok) {
          setSnapshot(body.data);
          setStatus("live");
        } else setStatus("error");
      } catch {
        if (!cancelled) setStatus("error");
      }
      schedule();
    }
    function schedule() {
      if (!cancelled) timer.current = setTimeout(tick, POLL_MS);
    }

    const onVisible = () => {
      if (!document.hidden) {
        if (timer.current) clearTimeout(timer.current);
        void tick();
      }
    };
    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      controller.abort();
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [projectId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
        <span className="relative flex size-2.5">
          {status === "live" && <span className="absolute inline-flex size-full animate-ping rounded-full bg-chart-3 opacity-60" />}
          <span
            className={`relative inline-flex size-2.5 rounded-full ${status === "live" ? "bg-chart-3" : status === "error" ? "bg-destructive" : "bg-muted-foreground"}`}
          />
        </span>
        {status === "live" ? "Live — updates every 5 seconds" : status === "paused" ? "Paused while tab is hidden" : "Connection issue — retrying"}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="gap-1 py-5">
          <CardContent className="px-5">
            <p className="text-sm text-muted-foreground">Active users</p>
            <p className="tabular mt-1 text-4xl font-semibold tracking-tight">{formatNumber(snapshot.activeUsers)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Distinct users in the last 5 minutes</p>
          </CardContent>
        </Card>
        <Card className="gap-1 py-5">
          <CardContent className="px-5">
            <p className="text-sm text-muted-foreground">Events · last hour</p>
            <p className="tabular mt-1 text-4xl font-semibold tracking-tight">{formatNumber(snapshot.eventsLastHour)}</p>
            <p className="mt-1 text-xs text-muted-foreground">All events received in the past 60 minutes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Events per minute</CardTitle>
          <CardDescription>Last 30 minutes · UTC</CardDescription>
        </CardHeader>
        <CardContent>
          <TimeseriesChart data={snapshot.perMinute} series={SERIES} bucket="minute" kind="bar" height={200} />
        </CardContent>
      </Card>

      <Card className="gap-0 pb-0">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-base">Latest events</CardTitle>
          <CardDescription>The 25 most recent events in the past hour</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {snapshot.recent.length === 0 ? (
            <EmptyState
              icon={Radio}
              title="Quiet right now"
              description="No events in the last hour. New events appear here within seconds."
              className="m-6"
            />
          ) : (
            <EventsTable events={snapshot.recent} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
