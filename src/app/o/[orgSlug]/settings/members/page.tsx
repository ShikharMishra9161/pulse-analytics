import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationNav } from "@/components/pagination-nav";
import { RoleBadge } from "@/components/role-badge";
import { UserAvatar } from "@/components/app-shell/user-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InviteMemberDialog } from "@/features/organizations/components/invite-member-dialog";
import { MemberRowActions, RevokeInvitationButton } from "@/features/organizations/components/member-row-actions";
import { listMembers, listPendingInvitations } from "@/features/organizations/service";
import { formatDate, formatRelative } from "@/lib/format";
import { parsePageParams } from "@/lib/pagination";
import { assignableRoles, can, canManageMember } from "@/lib/permissions";
import { requireOrgPage } from "@/server/access";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrgPage(orgSlug);
  const canInvite = can(ctx.role, "member:invite");
  const [members, invitations] = await Promise.all([
    listMembers(ctx.org.id, parsePageParams(await searchParams)),
    canInvite ? listPendingInvitations(ctx.org.id) : Promise.resolve([]),
  ]);
  const roles = assignableRoles(ctx.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        description="People with access to this organization and its projects."
        actions={canInvite ? <InviteMemberDialog organizationId={ctx.org.id} roles={roles} /> : null}
      />

      <Card className="py-0">
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                <TableHead className="w-12 pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.items.map((m) => {
                const isSelf = m.user.id === ctx.user.id;
                const manageable = !isSelf && canManageMember(ctx.role, m.role);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <UserAvatar user={m.user} className="size-8 rounded-full" />
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {m.user.name ?? m.user.email}
                            {isSelf && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{m.user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RoleBadge role={m.role} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{formatDate(m.createdAt)}</TableCell>
                    <TableCell className="pr-6">
                      {manageable && (
                        <MemberRowActions
                          organizationId={ctx.org.id}
                          memberId={m.id}
                          memberName={m.user.name ?? m.user.email}
                          role={m.role}
                          assignableRoles={roles}
                          canRemove
                        />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <PaginationNav {...members} noun="members" hrefFor={(page) => `/o/${orgSlug}/settings/members?page=${page}`} />

      {canInvite && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
            <CardDescription>Invitations that haven&apos;t been accepted yet.</CardDescription>
          </CardHeader>
          <CardContent>
            {invitations.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="No pending invitations"
                description="Invite teammates to collaborate on projects and dashboards."
                className="py-8"
              />
            ) : (
              <ul className="divide-y rounded-lg border">
                {invitations.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{inv.email}</div>
                      <div className="text-xs text-muted-foreground">
                        Invited {formatRelative(inv.createdAt)}
                        {inv.invitedBy && ` by ${inv.invitedBy.name ?? inv.invitedBy.email}`} · expires {formatDate(inv.expiresAt)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <RoleBadge role={inv.role} />
                      <RevokeInvitationButton organizationId={ctx.org.id} invitationId={inv.id} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
