"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { handleResult } from "@/lib/form";
import { resendVerificationAction } from "../actions";

export function CheckInbox({ email, devUrl: initialDevUrl }: { email: string; devUrl?: string }) {
  const [devUrl, setDevUrl] = useState(initialDevUrl);
  const [pending, startTransition] = useTransition();

  function resend() {
    startTransition(async () => {
      const data = handleResult(await resendVerificationAction({ email }), {
        success: "If the account needs verification, a new link is on its way.",
      });
      if (data?.devVerificationUrl) setDevUrl(data.devVerificationUrl);
    });
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
        <MailCheck className="size-6 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground">
        If <span className="font-medium text-foreground">{email}</span> can be registered, we&apos;ve sent a verification link
        to it. The link expires in 24 hours.
      </p>
      {devUrl && (
        <div className="mt-4 w-full rounded-lg border border-dashed bg-muted/50 p-3 text-left text-xs">
          <p className="mb-1 font-medium">Development mode — email is mocked</p>
          <Link href={devUrl} className="break-all text-primary underline underline-offset-4">
            Open verification link
          </Link>
        </div>
      )}
      <Button variant="ghost" size="sm" className="mt-4" onClick={resend} disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Resend email
      </Button>
    </div>
  );
}
