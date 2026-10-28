import { describe, expect, it } from "vitest";
import { assignableRoles, can, canAssignRole, canManageMember, PERMISSIONS, ROLES } from "@/lib/permissions";

describe("RBAC permission matrix", () => {
  it("lets every role read analytics", () => {
    for (const role of ROLES) expect(can(role, "analytics:read")).toBe(true);
  });

  it("keeps viewers read-only", () => {
    const writes = (Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]).filter((p) => !p.endsWith(":read"));
    for (const permission of writes) expect(can("VIEWER", permission)).toBe(false);
    expect(can("VIEWER", "apikey:read")).toBe(false);
  });

  it("allows only owners to delete the organization", () => {
    expect(ROLES.filter((r) => can(r, "org:delete"))).toEqual(["OWNER"]);
  });

  it("lets members create but not revoke keys or delete projects", () => {
    expect(can("MEMBER", "apikey:create")).toBe(true);
    expect(can("MEMBER", "apikey:revoke")).toBe(false);
    expect(can("MEMBER", "project:delete")).toBe(false);
  });

  it("denies everything to a missing role", () => {
    expect(can(null, "org:read")).toBe(false);
    expect(can(undefined, "analytics:read")).toBe(false);
  });
});

describe("member management hierarchy", () => {
  it("lets admins manage members and viewers, but not admins or owners", () => {
    expect(canManageMember("ADMIN", "MEMBER")).toBe(true);
    expect(canManageMember("ADMIN", "VIEWER")).toBe(true);
    expect(canManageMember("ADMIN", "ADMIN")).toBe(false);
    expect(canManageMember("ADMIN", "OWNER")).toBe(false);
  });

  it("prevents admins from granting admin or owner", () => {
    expect(assignableRoles("ADMIN")).toEqual(["MEMBER", "VIEWER"]);
    expect(canAssignRole("ADMIN", "OWNER")).toBe(false);
  });

  it("lets owners do anything", () => {
    expect(assignableRoles("OWNER")).toEqual([...ROLES]);
    expect(canManageMember("OWNER", "OWNER")).toBe(true);
  });

  it("gives members and viewers no management rights", () => {
    expect(assignableRoles("MEMBER")).toEqual([]);
    expect(canManageMember("MEMBER", "VIEWER")).toBe(false);
  });
});
