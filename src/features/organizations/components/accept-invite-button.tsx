"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { handleResult } from "@/lib/form";
import { acceptInvitationAction } from "../actions";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="lg"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const org = handleResult(await acceptInvitationAction({ token }), { success: "Welcome aboard!" });
          if (org) router.push(`/o/${org.slug}`);
        })
      }
    >
      {pending && <Loader2 className="animate-spin" />}
      Accept invitation
    </Button>
  );
}
