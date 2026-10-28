"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { revokeApiKeyAction } from "../actions";

export function RevokeKeyButton({ projectId, apiKeyId, name }: { projectId: string; apiKeyId: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          Revoke
        </Button>
      }
      title={`Revoke "${name}"?`}
      description="Requests using this key will be rejected within seconds. This can't be undone."
      actionLabel="Revoke key"
      onConfirm={async () => {
        const result = await revokeApiKeyAction({ projectId, apiKeyId });
        if (!result.ok) {
          toast.error(result.error.message);
          return false;
        }
        toast.success(`"${name}" revoked`);
        router.refresh();
        return true;
      }}
    />
  );
}
