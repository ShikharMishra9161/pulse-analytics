import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Server-rendered pagination using ?page= links (works without JS, shareable). */
export function PaginationNav({
  page,
  pageCount,
  total,
  pageSize,
  hrefFor,
  noun = "items",
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  hrefFor: (page: number) => string;
  noun?: string;
}) {
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
      <span className="tabular">
        {start}–{end} of {total.toLocaleString()} {noun}
      </span>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button asChild={page > 1} variant="outline" size="icon-sm" disabled={page <= 1} aria-label="Previous page">
            {page > 1 ? (
              <Link href={hrefFor(page - 1)}>
                <ChevronLeft />
              </Link>
            ) : (
              <ChevronLeft />
            )}
          </Button>
          <span className="tabular px-2">
            {page} / {pageCount}
          </span>
          <Button asChild={page < pageCount} variant="outline" size="icon-sm" disabled={page >= pageCount} aria-label="Next page">
            {page < pageCount ? (
              <Link href={hrefFor(page + 1)}>
                <ChevronRight />
              </Link>
            ) : (
              <ChevronRight />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
