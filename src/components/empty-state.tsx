import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      <div className="relative mb-4">
        <div className="absolute inset-0 -z-10 scale-150 rounded-full bg-primary/5 blur-xl" />
        <div className="flex size-11 items-center justify-center rounded-xl border bg-background shadow-xs">
          <Icon className="size-5 text-muted-foreground" />
        </div>
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-balance text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
