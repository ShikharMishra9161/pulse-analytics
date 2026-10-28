"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { handleResult } from "@/lib/form";
import { isRole, ROLE_LABELS, type Role } from "@/lib/permissions";
import { removeMemberAction, revokeInvitationAction, updateMemberRoleAction } from "../actions";

export function MemberRowActions({
  organizationId,
  memberId,
  memberName,
  role,
  assignableRoles,
  canRemove,
}: {
  organizationId: string;
  memberId: string;
  memberName: string;
  role: Role;
  assignableRoles: Role[];
  canRemove: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeRole(value: string) {
    if (!isRole(value) || value === role) return;
    startTransition(async () => {
      const ok = handleResult(await updateMemberRoleAction({ organizationId, memberId, role: value }), {
        success: `${memberName} is now ${ROLE_LABELS[value]}`,
      });
      if (ok) router.refresh();
    });
  }

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${memberName}`} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {assignableRoles.length > 0 && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Change role</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={role} onValueChange={changeRole}>
                {assignableRoles.map((r) => (
                  <DropdownMenuRadioItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </>
          )}
          {canRemove && (
            <>
              {assignableRoles.length > 0 && <DropdownMenuSeparator />}
              <ConfirmDialog
                trigger={
                  <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                    Remove from organization
                  </DropdownMenuItem>
                }
                title={`Remove ${memberName}?`}
                description="They'll immediately lose access to every project in this organization."
                actionLabel="Remove member"
                onConfirm={async () => {
                  const result = await removeMemberAction({ organizationId, memberId });
                  if (!result.ok) {
                    toast.error(result.error.message);
                    return false;
                  }
                  toast.success(`${memberName} was removed`);
                  router.refresh();
                  return true;
                }}
              />
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function RevokeInvitationButton({ organizationId, invitationId }: { organizationId: string; invitationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (handleResult(await revokeInvitationAction({ organizationId, invitationId }), { success: "Invitation revoked" })) {
            router.refresh();
          }
        })
      }
    >
      {pending && <Loader2 className="animate-spin" />}
      Revoke
    </Button>
  );
}
