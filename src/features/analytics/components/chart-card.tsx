"use client";

import { useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Chart container with a table-view toggle, so every value is reachable without hovering. */
export function ChartCard({
  title,
  description,
  chart,
  table,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  chart: React.ReactNode;
  table: React.ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setView(view === "chart" ? "table" : "chart")}
            aria-label={view === "chart" ? "Show as table" : "Show as chart"}
            title={view === "chart" ? "Show as table" : "Show as chart"}
          >
            {view === "chart" ? <Table2 /> : <BarChart3 />}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>{view === "chart" ? chart : <div className="max-h-72 overflow-auto">{table}</div>}</CardContent>
    </Card>
  );
}
