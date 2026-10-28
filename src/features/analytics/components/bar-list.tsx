import Link from "next/link";
import { formatCompact, formatNumber } from "@/lib/format";

export type BarListItem = { label: string; value: number; secondary?: string; href?: string };

/**
 * Plausible-style ranked list: a thin magnitude bar behind each row. Values are
 * always printed, so nothing depends on color or hover.
 */
export function BarList({ items, valueLabel }: { items: BarListItem[]; valueLabel: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div>
      <div className="mb-2 flex justify-between px-2 text-xs font-medium text-muted-foreground">
        <span>Name</span>
        <span>{valueLabel}</span>
      </div>
      <ul className="space-y-1">
        {items.map((item) => {
          const content = (
            <>
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-md bg-chart-1/15 transition-colors group-hover:bg-chart-1/25"
                style={{ width: `${Math.max(2, (item.value / max) * 100)}%` }}
              />
              <span className="relative min-w-0 truncate font-mono text-xs">{item.label}</span>
              <span className="relative flex shrink-0 items-baseline gap-2">
                {item.secondary && <span className="text-xs text-muted-foreground">{item.secondary}</span>}
                <span className="tabular text-sm font-medium" title={formatNumber(item.value)}>
                  {formatCompact(item.value)}
                </span>
              </span>
            </>
          );
          const className = "group relative flex h-8 items-center justify-between gap-3 rounded-md px-2";
          return (
            <li key={item.label}>
              {item.href ? (
                <Link href={item.href} scroll={false} className={`${className} hover:bg-muted/50`}>
                  {content}
                </Link>
              ) : (
                <div className={className}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
