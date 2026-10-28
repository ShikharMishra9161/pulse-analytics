"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteOrganizationAction, removeMemberAction } from "../actions";

export function OrgDangerZone({
  org,
  membershipId,
  canDelete,
}: {
  org: { id: string; name: string; slug: string };
  membershipId: string;
  canDelete: boolean;
}) {
  const router = useRouter();

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>Danger zone</CardTitle>
        <CardDescription>These actions are irreversible.</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Leave organization</p>
            <p className="text-sm text-muted-foreground">You&apos;ll lose access to all of its projects.</p>
          </div>
          <ConfirmDialog
            trigger={<Button variant="outline">Leave</Button>}
            title={`Leave ${org.name}?`}
            description="You'll need a new invitation to rejoin."
            actionLabel="Leave organization"
            onConfirm={async () => {
              const result = await removeMemberAction({ organizationId: org.id, memberId: membershipId });
              if (!result.ok) {
                toast.error(result.error.message);
                return false;
              }
              toast.success(`You left ${org.name}`);
              router.push("/dashboard");
              return true;
            }}
          />
        </div>
        {canDelete && (
          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Delete organization</p>
              <p className="text-sm text-muted-foreground">Permanently delete all projects, events, keys and members.</p>
            </div>
            <ConfirmDialog
              trigger={<Button variant="destructive">Delete organization</Button>}
              title="Delete organization"
              description={
                <>
                  This permanently deletes <strong>{org.name}</strong> and all of its data. This cannot be undone.
                </>
              }
              confirmText={org.slug}
              actionLabel="Delete forever"
              onConfirm={async (typed) => {
                const result = await deleteOrganizationAction({ organizationId: org.id, confirmation: typed });
                if (!result.ok) {
                  toast.error(result.error.message);
                  return false;
                }
                toast.success("Organization deleted");
                router.push("/dashboard");
                return true;
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
