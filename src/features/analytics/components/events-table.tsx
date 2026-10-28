"use client";

import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TimeAgo } from "@/components/time-ago";
import { cn } from "@/lib/utils";
import type { EventRow } from "../queries";

export function EventsTable({ events, compact = false }: { events: EventRow[]; compact?: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8 pl-4" />
          <TableHead>Event</TableHead>
          <TableHead>User</TableHead>
          {!compact && <TableHead className="hidden lg:table-cell">Properties</TableHead>}
          <TableHead className="pr-4 text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {events.map((e) => {
          const open = expanded === e.id;
          const keys = Object.keys(e.properties);
          return (
            <Fragment key={e.id}>
              <TableRow
                className="cursor-pointer"
                onClick={() => setExpanded(open ? null : e.id)}
                aria-expanded={open}
                tabIndex={0}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    setExpanded(open ? null : e.id);
                  }
                }}
              >
                <TableCell className="pl-4">
                  <ChevronRight className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-90")} />
                </TableCell>
                <TableCell>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs font-medium">{e.name}</span>
                </TableCell>
                <TableCell className="max-w-40 truncate font-mono text-xs text-muted-foreground">{e.distinctId}</TableCell>
                {!compact && (
                  <TableCell className="hidden max-w-md truncate text-xs text-muted-foreground lg:table-cell">
                    {keys.length === 0
                      ? "—"
                      : keys
                          .slice(0, 4)
                          .map((k) => `${k}: ${preview(e.properties[k])}`)
                          .join(" · ")}
                  </TableCell>
                )}
                <TableCell className="pr-4 text-right text-xs whitespace-nowrap text-muted-foreground">
                  <TimeAgo date={e.timestamp} />
                </TableCell>
              </TableRow>
              {open && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={compact ? 4 : 5} className="bg-muted/30 px-4 py-3">
                    <dl className="mb-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                      <dt className="text-muted-foreground">Timestamp</dt>
                      <dd className="font-mono">{e.timestamp}</dd>
                      <dt className="text-muted-foreground">Distinct ID</dt>
                      <dd className="font-mono break-all">{e.distinctId}</dd>
                    </dl>
                    <pre className="max-h-64 overflow-auto rounded-md border bg-background p-3 font-mono text-xs whitespace-pre-wrap">
                      {JSON.stringify(e.properties, null, 2)}
                    </pre>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

function preview(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "object") return Array.isArray(v) ? `[${v.length}]` : "{…}";
  const s = String(v);
  return s.length > 24 ? `${s.slice(0, 24)}…` : s;
}
