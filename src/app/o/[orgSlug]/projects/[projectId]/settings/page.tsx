import type { Metadata } from "next";
import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/page-header";
import { DeleteProjectCard, ProjectSettingsForm } from "@/features/projects/components/project-settings";
import { can } from "@/lib/permissions";
import { requireProjectPage } from "@/server/access";

export const metadata: Metadata = { title: "Project settings" };

export default async function ProjectSettingsPage({ params }: { params: Promise<{ orgSlug: string; projectId: string }> }) {
  const { orgSlug, projectId } = await params;
  const ctx = await requireProjectPage(orgSlug, projectId);
  if (!can(ctx.role, "project:update")) return <AccessDenied what="project settings" />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Project settings" description={ctx.project.name} />
      <ProjectSettingsForm project={ctx.project} />
      {can(ctx.role, "project:delete") && <DeleteProjectCard project={ctx.project} />}
    </div>
  );
}
