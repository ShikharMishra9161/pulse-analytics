"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleAlert, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { handleResult } from "@/lib/form";
import { verifyEmailAction } from "../actions";

/**
 * Verification is a deliberate button press (POST), not a GET side effect,
 * so link scanners and prefetchers can't consume the token.
 */
export function VerifyEmailConfirm({ email, token }: { email: string; token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState<"invalid" | "expired" | null>(null);

  function confirm() {
    startTransition(async () => {
      const data = handleResult(await verifyEmailAction({ email, token }));
      if (!data) return;
      if (data.outcome === "verified") router.push("/login?verified=1");
      else setFailed(data.outcome);
    });
  }

  if (failed) {
    return (
      <div className="flex flex-col items-center text-center">
        <CircleAlert className="mb-3 size-8 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {failed === "expired" ? "This link has expired." : "This link is invalid or has already been used."}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href={`/verify-email?${new URLSearchParams({ email })}`}>Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
        <ShieldCheck className="size-6 text-primary" />
      </div>
      <p className="mb-5 text-sm text-muted-foreground">
        Confirm <span className="font-medium text-foreground">{email}</span> as your account email.
      </p>
      <Button size="lg" className="w-full" onClick={confirm} disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Verify email
      </Button>
    </div>
  );
}
