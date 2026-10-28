import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { forbidden, notFound as notFoundError } from "@/lib/errors";
import { can, type Permission, type Role } from "@/lib/permissions";
import { authenticate, requireUser, type CurrentUser } from "./session";

export type OrgSummary = { id: string; name: string; slug: string };
export type ProjectSummary = { id: string; name: string; description: string | null; organizationId: string };

export type OrgContext = {
  user: CurrentUser;
  org: OrgSummary;
  role: Role;
};

export type ProjectContext = OrgContext & { project: ProjectSummary };

const membershipBySlug = cache(async (userId: string, slug: string) =>
  db.organizationMember.findFirst({
    where: { userId, organization: { slug } },
    select: { role: true, organization: { select: { id: true, name: true, slug: true } } },
  }),
);

const membershipById = cache(async (userId: string, organizationId: string) =>
  db.organizationMember.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    select: { role: true, organization: { select: { id: true, name: true, slug: true } } },
  }),
);

const projectById = cache(async (projectId: string) =>
  db.project.findUnique({
    where: { id: projectId },
    select: { id: true, name: true, description: true, organizationId: true },
  }),
);

// ─── Pages (render 404 instead of leaking existence) ─────────────────────────

export async function requireOrgPage(slug: string): Promise<OrgContext> {
  const user = await requireUser();
  const membership = await membershipBySlug(user.id, slug);
  if (!membership) notFound();
  return { user, org: membership.organization, role: membership.role };
}

export async function requireProjectPage(slug: string, projectId: string): Promise<ProjectContext> {
  const ctx = await requireOrgPage(slug);
  const project = await projectById(projectId);
  if (!project || project.organizationId !== ctx.org.id) notFound();
  return { ...ctx, project };
}

// ─── Actions / route handlers (throw AppError) ───────────────────────────────

export async function authorizeOrg(organizationId: string, permission: Permission): Promise<OrgContext> {
  const user = await authenticate();
  const membership = await membershipById(user.id, organizationId);
  // Non-members get 404, not 403, so organization ids can't be probed.
  if (!membership) throw notFoundError("Organization");
  if (!can(membership.role, permission)) throw forbidden();
  return { user, org: membership.organization, role: membership.role };
}

export async function authorizeProject(projectId: string, permission: Permission): Promise<ProjectContext> {
  const user = await authenticate();
  const project = await projectById(projectId);
  if (!project) throw notFoundError("Project");
  const membership = await membershipById(user.id, project.organizationId);
  if (!membership) throw notFoundError("Project");
  if (!can(membership.role, permission)) throw forbidden();
  return { user, org: membership.organization, role: membership.role, project };
}
