import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { OrgDangerZone } from "@/features/organizations/components/org-danger-zone";
import { OrgSettingsForm } from "@/features/organizations/components/org-settings-form";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { requireOrgPage } from "@/server/access";

export const metadata: Metadata = { title: "Organization settings" };

export default async function OrgSettingsPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const ctx = await requireOrgPage(orgSlug);
  const membership = await db.organizationMember.findUniqueOrThrow({
    where: { organizationId_userId: { organizationId: ctx.org.id, userId: ctx.user.id } },
    select: { id: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Organization settings" description="Manage how your organization appears across Pulse." />
      <OrgSettingsForm org={ctx.org} disabled={!can(ctx.role, "org:update")} />
      <OrgDangerZone org={ctx.org} membershipId={membership.id} canDelete={can(ctx.role, "org:delete")} />
    </div>
  );
}
