"use client";

import { createContext, useCallback, useContext, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type FrameContext = {
  pending: boolean;
  /** Merge params into the URL (null/"" removes a key). Runs in a transition so the old frame stays on screen. */
  setParams: (updates: Record<string, string | null | undefined>) => void;
};

const Context = createContext<FrameContext | null>(null);

export function useAnalyticsFrame(): FrameContext {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useAnalyticsFrame must be used inside <AnalyticsFrame>");
  return ctx;
}

/**
 * Filters live in the URL (shareable, server-rendered). While a new slice loads,
 * the previous render is kept and dimmed — no skeleton flash, no layout jump.
 */
export function AnalyticsFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setParams = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") next.delete(key);
        else next.set(key, value);
      }
      next.delete("cursor"); // any filter change restarts pagination
      const qs = next.toString();
      startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [pathname, router, searchParams],
  );

  return <Context.Provider value={{ pending, setParams }}>{children}</Context.Provider>;
}

export function AnalyticsContent({ children, className }: { children: React.ReactNode; className?: string }) {
  const { pending } = useAnalyticsFrame();
  return (
    <div
      aria-busy={pending}
      className={cn("transition-opacity duration-200", pending && "pointer-events-none opacity-50", className)}
    >
      {children}
    </div>
  );
}
