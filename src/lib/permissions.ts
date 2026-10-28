/**
 * Role-based access control. Pure and isomorphic: the server enforces these
 * rules on every mutation/query; the client uses the same functions only to
 * hide or disable UI.
 */

export const ROLES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
  VIEWER: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: "Full access, including billing-level actions and deleting the organization.",
  ADMIN: "Manage members, projects, API keys and organization settings.",
  MEMBER: "Create and edit projects, create API keys, view analytics.",
  VIEWER: "Read-only access to dashboards and analytics.",
};

const RANK: Record<Role, number> = { OWNER: 4, ADMIN: 3, MEMBER: 2, VIEWER: 1 };

const ALL: readonly Role[] = ROLES;
const MANAGERS: readonly Role[] = ["OWNER", "ADMIN"];
const CONTRIBUTORS: readonly Role[] = ["OWNER", "ADMIN", "MEMBER"];

export const PERMISSIONS = {
  "org:read": ALL,
  "org:update": MANAGERS,
  "org:delete": ["OWNER"],
  "member:read": ALL,
  "member:invite": MANAGERS,
  "member:manage": MANAGERS,
  "project:read": ALL,
  "project:create": CONTRIBUTORS,
  "project:update": CONTRIBUTORS,
  "project:delete": MANAGERS,
  "apikey:read": CONTRIBUTORS,
  "apikey:create": CONTRIBUTORS,
  "apikey:revoke": MANAGERS,
  "analytics:read": ALL,
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/** Can `actor` change or remove a member who currently has role `target`? */
export function canManageMember(actor: Role, target: Role): boolean {
  if (!can(actor, "member:manage")) return false;
  return actor === "OWNER" || RANK[actor] > RANK[target];
}

/** Can `actor` grant role `role` (via invite or role change)? Admins can't create admins or owners. */
export function canAssignRole(actor: Role, role: Role): boolean {
  if (!can(actor, "member:manage")) return false;
  return actor === "OWNER" || RANK[actor] > RANK[role];
}

export function assignableRoles(actor: Role): Role[] {
  return ROLES.filter((r) => canAssignRole(actor, r));
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}
