"use client";

import { useState } from "react";
import { CalendarDays, Check, ChevronDown, Filter, Loader2, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { RANGE_PRESETS, toDateParam, type AnalyticsFilters, type RangePreset } from "../filters";
import { useAnalyticsFrame } from "./analytics-frame";

const ALL_EVENTS = "__all__";

export type FilterBarProps = {
  range: { preset: RangePreset | "custom"; label: string; from: string; to: string };
  filters: AnalyticsFilters;
  eventNames: string[];
  propertyKeys: string[];
  showEventFilter?: boolean;
};

/** One row, above everything it scopes: date range first, then dimensions. */
export function FilterBar({ range, filters, eventNames, propertyKeys, showEventFilter = true }: FilterBarProps) {
  const { pending, setParams } = useAnalyticsFrame();
  const names = filters.event && !eventNames.includes(filters.event) ? [filters.event, ...eventNames] : eventNames;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DateRangePicker range={range} onChange={setParams} />
      {showEventFilter && (
        <Select value={filters.event ?? ALL_EVENTS} onValueChange={(v) => setParams({ event: v === ALL_EVENTS ? null : v })}>
          <SelectTrigger className="w-auto min-w-40 bg-background" aria-label="Filter by event">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_EVENTS}>All events</SelectItem>
            {names.map((n) => (
              <SelectItem key={n} value={n}>
                <span className="font-mono text-xs">{n}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {filters.property ? (
        <Badge variant="secondary" className="h-8 gap-1.5 rounded-lg px-2.5 text-sm font-normal">
          <span className="font-mono text-xs">{filters.property.key}</span>
          <span className="text-muted-foreground">=</span>
          <span className="max-w-40 truncate font-medium">{filters.property.value}</span>
          <button
            type="button"
            className="-mr-1 rounded p-0.5 hover:bg-background"
            aria-label="Remove property filter"
            onClick={() => setParams({ prop: null, val: null })}
          >
            <X className="size-3.5" />
          </button>
        </Badge>
      ) : (
        <PropertyFilter keys={propertyKeys} onApply={(key, value) => setParams({ prop: key, val: value })} />
      )}
      {(filters.event || filters.property) && (
        <Button variant="ghost" size="sm" onClick={() => setParams({ event: null, prop: null, val: null })}>
          Clear filters
        </Button>
      )}
      {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />}
    </div>
  );
}

function DateRangePicker({
  range,
  onChange,
}: {
  range: FilterBarProps["range"];
  onChange: (updates: Record<string, string | null>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState<DateRange | undefined>(
    range.preset === "custom" ? { from: new Date(range.from), to: new Date(range.to) } : undefined,
  );

  const pickPreset = (preset: RangePreset) => {
    onChange({ range: preset, from: null, to: null });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="bg-background font-normal">
          <CalendarDays className="text-muted-foreground" />
          {range.label}
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <ul className="p-1" role="listbox" aria-label="Date range">
          {(Object.keys(RANGE_PRESETS) as RangePreset[]).map((preset) => {
            const selected = range.preset === preset;
            return (
              <li key={preset}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pickPreset(preset)}
                  className={cn(
                    "flex w-full items-center justify-between gap-6 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted",
                    selected && "font-medium",
                  )}
                >
                  {RANGE_PRESETS[preset].label}
                  {selected && <Check className="size-4" strokeWidth={2.5} />}
                </button>
              </li>
            );
          })}
        </ul>
        <Separator />
        <div className="p-2">
          <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">Custom range (UTC)</p>
          <Calendar
            mode="range"
            numberOfMonths={1}
            selected={custom}
            onSelect={setCustom}
            disabled={{ after: new Date() }}
            defaultMonth={custom?.from}
          />
          <Button
            size="sm"
            className="w-full"
            disabled={!custom?.from}
            onClick={() => {
              if (!custom?.from) return;
              onChange({
                range: "custom",
                from: toDateParam(utcDate(custom.from)),
                to: toDateParam(utcDate(custom.to ?? custom.from)),
              });
              setOpen(false);
            }}
          >
            Apply range
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Calendar days are local; the API takes UTC calendar dates. */
function utcDate(local: Date): Date {
  return new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
}

function PropertyFilter({ keys, onApply }: { keys: string[]; onApply: (key: string, value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState<string>("");
  const [value, setValue] = useState("");
  const canApply = key.trim().length > 0 && value.trim().length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="border-dashed bg-background font-normal">
          <Filter className="text-muted-foreground" /> Property
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canApply) return;
            onApply(key.trim(), value.trim());
            setOpen(false);
            setValue("");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="prop-key">Property</Label>
            {keys.length > 0 ? (
              <Select value={key} onValueChange={setKey}>
                <SelectTrigger id="prop-key" className="w-full">
                  <SelectValue placeholder="Choose a property" />
                </SelectTrigger>
                <SelectContent>
                  {keys.map((k) => (
                    <SelectItem key={k} value={k}>
                      <span className="font-mono text-xs">{k}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input id="prop-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. plan" maxLength={200} />
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prop-value">equals</Label>
            <Input id="prop-value" value={value} onChange={(e) => setValue(e.target.value)} placeholder="e.g. pro" maxLength={200} />
          </div>
          <Button type="submit" size="sm" className="w-full" disabled={!canApply}>
            Apply filter
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
