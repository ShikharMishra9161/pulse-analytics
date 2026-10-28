"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl border bg-background">
        <AlertTriangle className="size-5 text-muted-foreground" />
      </div>
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred. {error.digest && <span className="font-mono text-xs">Ref: {error.digest}</span>}
      </p>
      <Button onClick={reset} variant="outline" className="mt-2">
        Try again
      </Button>
    </div>
  );
}
