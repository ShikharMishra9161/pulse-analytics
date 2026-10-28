"use server";

import { revalidatePath } from "next/cache";
import { createAction } from "@/lib/action";
import { AppError } from "@/lib/errors";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { authorizeOrg } from "@/server/access";
import { authenticate } from "@/server/session";
import {
  acceptInvitationSchema,
  createOrganizationSchema,
  deleteOrganizationSchema,
  inviteMemberSchema,
  removeMemberSchema,
  revokeInvitationSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
} from "./schemas";
import * as orgs from "./service";

export const createOrganizationAction = createAction(createOrganizationSchema, async (input) => {
  const user = await authenticate();
  const org = await orgs.createOrganization(user.id, input);
  revalidatePath("/", "layout");
  return org;
});

export const updateOrganizationAction = createAction(updateOrganizationSchema, async (input) => {
  await authorizeOrg(input.organizationId, "org:update");
  const org = await orgs.updateOrganization(input);
  revalidatePath("/", "layout");
  return org;
});

export const deleteOrganizationAction = createAction(deleteOrganizationSchema, async (input) => {
  await authorizeOrg(input.organizationId, "org:delete");
  await orgs.deleteOrganization(input.organizationId, input.confirmation);
  revalidatePath("/", "layout");
  return { deleted: true };
});

export const inviteMemberAction = createAction(inviteMemberSchema, async (input) => {
  const ctx = await authorizeOrg(input.organizationId, "member:invite");
  const limit = await rateLimit(RATE_LIMITS.invite, ctx.org.id);
  if (!limit.success) throw new AppError("RATE_LIMITED", "Invitation limit reached. Try again later.");
  const invitation = await orgs.inviteMember({
    organizationId: ctx.org.id,
    actorUserId: ctx.user.id,
    actorRole: ctx.role,
    email: input.email,
    role: input.role,
  });
  revalidatePath(`/o/${ctx.org.slug}/settings/members`);
  return invitation;
});

export const revokeInvitationAction = createAction(revokeInvitationSchema, async (input) => {
  const ctx = await authorizeOrg(input.organizationId, "member:invite");
  await orgs.revokeInvitation(ctx.org.id, input.invitationId);
  revalidatePath(`/o/${ctx.org.slug}/settings/members`);
  return { revoked: true };
});

export const updateMemberRoleAction = createAction(updateMemberRoleSchema, async (input) => {
  const ctx = await authorizeOrg(input.organizationId, "member:manage");
  await orgs.updateMemberRole({
    organizationId: ctx.org.id,
    actorUserId: ctx.user.id,
    actorRole: ctx.role,
    memberId: input.memberId,
    role: input.role,
  });
  revalidatePath(`/o/${ctx.org.slug}`, "layout");
  return { updated: true };
});

/** Remove another member (managers) or leave the organization (anyone). */
export const removeMemberAction = createAction(removeMemberSchema, async (input) => {
  const ctx = await authorizeOrg(input.organizationId, "org:read");
  const result = await orgs.removeMember({
    organizationId: ctx.org.id,
    actorUserId: ctx.user.id,
    actorRole: ctx.role,
    memberId: input.memberId,
  });
  revalidatePath("/", "layout");
  return result;
});

export const acceptInvitationAction = createAction(acceptInvitationSchema, async ({ token }) => {
  const user = await authenticate();
  const org = await orgs.acceptInvitation(token, user);
  revalidatePath("/", "layout");
  return org;
});
