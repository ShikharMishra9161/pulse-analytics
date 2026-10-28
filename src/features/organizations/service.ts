import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { AppError, badRequest, conflict, forbidden, notFound } from "@/lib/errors";
import { appUrl, sendMail } from "@/lib/mail";
import { paginate, skipTake, type PageParams } from "@/lib/pagination";
import { canAssignRole, canManageMember, ROLE_LABELS, type Role } from "@/lib/permissions";
import { randomSuffix, slugify } from "@/lib/slug";
import type { CreateOrganizationInput, UpdateOrganizationInput } from "./schemas";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Organizations ───────────────────────────────────────────────────────────

export async function listUserOrganizations(userId: string) {
  const memberships = await db.organizationMember.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { role: true, organization: { select: { id: true, name: true, slug: true } } },
  });
  return memberships.map((m) => ({ ...m.organization, role: m.role }));
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "org";
  const padded = base.length < 3 ? `${base}-org` : base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? padded : `${padded}-${randomSuffix()}`;
    const taken = await db.organization.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${padded}-${randomSuffix(8)}`;
}

export async function createOrganization(userId: string, input: CreateOrganizationInput) {
  const slug = await uniqueSlug(input.name);
  return db.organization.create({
    data: { name: input.name, slug, members: { create: { userId, role: "OWNER" } } },
    select: { id: true, name: true, slug: true },
  });
}

export async function updateOrganization(input: UpdateOrganizationInput) {
  try {
    return await db.organization.update({
      where: { id: input.organizationId },
      data: { name: input.name, slug: input.slug },
      select: { id: true, name: true, slug: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new AppError("CONFLICT", "That URL is already taken.", { slug: ["That URL is already taken."] });
    }
    throw err;
  }
}

export async function deleteOrganization(organizationId: string, confirmation: string) {
  const org = await db.organization.findUnique({ where: { id: organizationId }, select: { slug: true } });
  if (!org) throw notFound("Organization");
  if (confirmation !== org.slug) {
    throw new AppError("VALIDATION_ERROR", "Confirmation doesn't match.", {
      confirmation: [`Type "${org.slug}" to confirm.`],
    });
  }
  await db.organization.delete({ where: { id: organizationId } });
}

// ─── Members ─────────────────────────────────────────────────────────────────

export async function listMembers(organizationId: string, params: PageParams) {
  const where = { organizationId };
  const [items, total] = await Promise.all([
    db.organizationMember.findMany({
      where,
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      ...skipTake(params),
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    db.organizationMember.count({ where }),
  ]);
  return paginate(items, total, params);
}

export async function listPendingInvitations(organizationId: string) {
  return db.invitation.findMany({
    where: { organizationId, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, email: true, role: true, createdAt: true, expiresAt: true, invitedBy: { select: { name: true, email: true } } },
  });
}

async function ownerCount(organizationId: string) {
  return db.organizationMember.count({ where: { organizationId, role: "OWNER" } });
}

export async function updateMemberRole(params: {
  organizationId: string;
  actorUserId: string;
  actorRole: Role;
  memberId: string;
  role: Role;
}) {
  const member = await db.organizationMember.findFirst({
    where: { id: params.memberId, organizationId: params.organizationId },
  });
  if (!member) throw notFound("Member");
  if (member.role === params.role) return member;
  if (!canManageMember(params.actorRole, member.role) || !canAssignRole(params.actorRole, params.role)) {
    throw forbidden("You can't change this member's role.");
  }
  if (member.role === "OWNER" && (await ownerCount(params.organizationId)) <= 1) {
    throw badRequest("An organization needs at least one owner. Promote someone else first.");
  }
  return db.organizationMember.update({ where: { id: member.id }, data: { role: params.role } });
}

export async function removeMember(params: {
  organizationId: string;
  actorUserId: string;
  actorRole: Role;
  memberId: string;
}) {
  const member = await db.organizationMember.findFirst({
    where: { id: params.memberId, organizationId: params.organizationId },
  });
  if (!member) throw notFound("Member");
  const isSelf = member.userId === params.actorUserId;
  if (!isSelf && !canManageMember(params.actorRole, member.role)) {
    throw forbidden("You can't remove this member.");
  }
  if (member.role === "OWNER" && (await ownerCount(params.organizationId)) <= 1) {
    throw badRequest("The last owner can't leave. Transfer ownership or delete the organization.");
  }
  await db.organizationMember.delete({ where: { id: member.id } });
  return { leftOrganization: isSelf };
}

// ─── Invitations ─────────────────────────────────────────────────────────────

export async function inviteMember(params: {
  organizationId: string;
  actorUserId: string;
  actorRole: Role;
  email: string;
  role: Role;
}) {
  if (!canAssignRole(params.actorRole, params.role)) {
    throw forbidden(`You can't invite someone as ${ROLE_LABELS[params.role]}.`);
  }
  const existingMember = await db.organizationMember.findFirst({
    where: { organizationId: params.organizationId, user: { email: params.email } },
    select: { id: true },
  });
  if (existingMember) throw conflict("This person is already a member.");

  const token = randomToken(32);
  const org = await db.organization.findUniqueOrThrow({
    where: { id: params.organizationId },
    select: { name: true },
  });

  const invitation = await db.$transaction(async (tx) => {
    // Re-inviting replaces any pending invitation for the same email.
    await tx.invitation.updateMany({
      where: { organizationId: params.organizationId, email: params.email, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return tx.invitation.create({
      data: {
        organizationId: params.organizationId,
        email: params.email,
        role: params.role,
        tokenHash: sha256(token),
        invitedById: params.actorUserId,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
      select: { id: true, email: true, role: true },
    });
  });

  const url = appUrl(`/invite/${token}`);
  await sendMail({
    to: params.email,
    subject: `You've been invited to ${org.name} on Pulse`,
    text: `You've been invited to join ${org.name} as ${ROLE_LABELS[params.role]}.\n\nAccept the invitation (valid for 7 days):\n${url}`,
  });

  return { ...invitation, devInviteUrl: process.env.NODE_ENV !== "production" ? url : undefined };
}

export async function revokeInvitation(organizationId: string, invitationId: string) {
  const { count } = await db.invitation.updateMany({
    where: { id: invitationId, organizationId, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (count === 0) throw notFound("Invitation");
}

export async function getInvitationByToken(token: string) {
  const invitation = await db.invitation.findUnique({
    where: { tokenHash: sha256(token) },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      acceptedAt: true,
      revokedAt: true,
      organization: { select: { id: true, name: true, slug: true } },
      invitedBy: { select: { name: true, email: true } },
    },
  });
  if (!invitation) return { status: "invalid" as const };
  if (invitation.revokedAt) return { status: "invalid" as const };
  if (invitation.acceptedAt) return { status: "accepted" as const, invitation };
  if (invitation.expiresAt < new Date()) return { status: "expired" as const, invitation };
  return { status: "pending" as const, invitation };
}

export async function acceptInvitation(token: string, user: { id: string; email: string }) {
  const lookup = await getInvitationByToken(token);
  if (lookup.status !== "pending") throw badRequest("This invitation is no longer valid.");
  const { invitation } = lookup;
  // The invite is bound to the invited address — a leaked link can't be used by another account.
  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    throw forbidden(`This invitation was sent to ${invitation.email}. Sign in with that account to accept it.`);
  }

  await db.$transaction(async (tx) => {
    const claimed = await tx.invitation.updateMany({
      where: { id: invitation.id, acceptedAt: null, revokedAt: null },
      data: { acceptedAt: new Date() },
    });
    if (claimed.count === 0) throw badRequest("This invitation is no longer valid.");
    await tx.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: invitation.organization.id, userId: user.id } },
      create: { organizationId: invitation.organization.id, userId: user.id, role: invitation.role },
      update: {},
    });
  });
  return invitation.organization;
}
