import { beforeEach, describe, expect, it } from "vitest";
import {
  acceptInvitation,
  createOrganization,
  inviteMember,
  removeMember,
  updateMemberRole,
} from "@/features/organizations/service";
import { AppError } from "@/lib/errors";
import { createUser, db, resetDatabase } from "../db";

async function org() {
  const owner = await createUser("owner@acme.dev");
  const created = await createOrganization(owner.id, { name: "Acme" });
  return { owner, org: created };
}

async function addMember(organizationId: string, email: string, role: "ADMIN" | "MEMBER" | "VIEWER" | "OWNER") {
  const user = await createUser(email);
  const membership = await db.organizationMember.create({ data: { organizationId, userId: user.id, role } });
  return { user, membership };
}

const code = async (p: Promise<unknown>) => {
  try {
    await p;
    return "OK";
  } catch (err) {
    if (err instanceof AppError) return err.code;
    throw err;
  }
};

describe("organizations", () => {
  beforeEach(resetDatabase);

  it("makes the creator the owner and generates a unique slug", async () => {
    const { owner, org: a } = await org();
    const b = await createOrganization(owner.id, { name: "Acme" });
    expect(a.slug).toBe("acme");
    expect(b.slug).toMatch(/^acme-[a-z0-9]{4}$/);
    const m = await db.organizationMember.findFirstOrThrow({ where: { organizationId: a.id } });
    expect(m.role).toBe("OWNER");
  });

  it("never removes or demotes the last owner", async () => {
    const { owner, org: o } = await org();
    const m = await db.organizationMember.findFirstOrThrow({ where: { userId: owner.id } });
    expect(await code(removeMember({ organizationId: o.id, actorUserId: owner.id, actorRole: "OWNER", memberId: m.id }))).toBe("BAD_REQUEST");
    expect(await code(updateMemberRole({ organizationId: o.id, actorUserId: owner.id, actorRole: "OWNER", memberId: m.id, role: "ADMIN" }))).toBe(
      "BAD_REQUEST",
    );
  });

  it("stops admins from touching owners or other admins, or granting admin", async () => {
    const { owner, org: o } = await org();
    const admin = await addMember(o.id, "admin@acme.dev", "ADMIN");
    const admin2 = await addMember(o.id, "admin2@acme.dev", "ADMIN");
    const member = await addMember(o.id, "member@acme.dev", "MEMBER");
    const ownerM = await db.organizationMember.findFirstOrThrow({ where: { userId: owner.id } });
    const actor = { organizationId: o.id, actorUserId: admin.user.id, actorRole: "ADMIN" as const };

    expect(await code(removeMember({ ...actor, memberId: ownerM.id }))).toBe("FORBIDDEN");
    expect(await code(removeMember({ ...actor, memberId: admin2.membership.id }))).toBe("FORBIDDEN");
    expect(await code(updateMemberRole({ ...actor, memberId: member.membership.id, role: "ADMIN" }))).toBe("FORBIDDEN");
    expect(await code(updateMemberRole({ ...actor, memberId: member.membership.id, role: "VIEWER" }))).toBe("OK");
    expect(await code(removeMember({ ...actor, memberId: member.membership.id }))).toBe("OK");
  });

  it("lets anyone leave", async () => {
    const { org: o } = await org();
    const viewer = await addMember(o.id, "v@acme.dev", "VIEWER");
    const r = await removeMember({ organizationId: o.id, actorUserId: viewer.user.id, actorRole: "VIEWER", memberId: viewer.membership.id });
    expect(r.leftOrganization).toBe(true);
  });

  it("only scopes member operations to the given organization", async () => {
    const { owner, org: o } = await org();
    const other = await createOrganization(owner.id, { name: "Other" });
    const outsider = await addMember(other.id, "x@other.dev", "MEMBER");
    expect(
      await code(removeMember({ organizationId: o.id, actorUserId: owner.id, actorRole: "OWNER", memberId: outsider.membership.id })),
    ).toBe("NOT_FOUND");
  });
});

describe("invitations", () => {
  beforeEach(resetDatabase);

  it("binds an invitation to the invited email and is single-use", async () => {
    const { owner, org: o } = await org();
    const inv = await inviteMember({ organizationId: o.id, actorUserId: owner.id, actorRole: "OWNER", email: "new@acme.dev", role: "MEMBER" });
    const token = inv.devInviteUrl!.split("/invite/")[1]!;

    const stranger = await createUser("stranger@evil.dev");
    expect(await code(acceptInvitation(token, stranger))).toBe("FORBIDDEN");

    const invitee = await createUser("new@acme.dev");
    expect(await code(acceptInvitation(token, invitee))).toBe("OK");
    const m = await db.organizationMember.findFirstOrThrow({ where: { userId: invitee.id } });
    expect(m.role).toBe("MEMBER");

    expect(await code(acceptInvitation(token, invitee))).toBe("BAD_REQUEST");
  });

  it("stores only a hash of the token and rejects expired invitations", async () => {
    const { owner, org: o } = await org();
    const inv = await inviteMember({ organizationId: o.id, actorUserId: owner.id, actorRole: "OWNER", email: "late@acme.dev", role: "VIEWER" });
    const token = inv.devInviteUrl!.split("/invite/")[1]!;
    const row = await db.invitation.findFirstOrThrow();
    expect(row.tokenHash).not.toBe(token);
    await db.invitation.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await code(acceptInvitation(token, await createUser("late@acme.dev")))).toBe("BAD_REQUEST");
  });

  it("prevents admins from inviting admins and blocks duplicate members", async () => {
    const { owner, org: o } = await org();
    const admin = await addMember(o.id, "admin@acme.dev", "ADMIN");
    expect(
      await code(inviteMember({ organizationId: o.id, actorUserId: admin.user.id, actorRole: "ADMIN", email: "x@acme.dev", role: "ADMIN" })),
    ).toBe("FORBIDDEN");
    expect(
      await code(inviteMember({ organizationId: o.id, actorUserId: owner.id, actorRole: "OWNER", email: "admin@acme.dev", role: "MEMBER" })),
    ).toBe("CONFLICT");
  });

  it("re-inviting revokes the previous pending invitation", async () => {
    const { owner, org: o } = await org();
    const args = { organizationId: o.id, actorUserId: owner.id, actorRole: "OWNER" as const, email: "re@acme.dev", role: "MEMBER" as const };
    const first = await inviteMember(args);
    await inviteMember(args);
    const oldToken = first.devInviteUrl!.split("/invite/")[1]!;
    expect(await code(acceptInvitation(oldToken, await createUser("re@acme.dev")))).toBe("BAD_REQUEST");
  });
});
