import { z } from "zod";
import { emailSchema } from "@/features/auth/schemas";
import { ROLES } from "@/lib/permissions";

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters")
  .max(40, "Use at most 40 characters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and single dashes only");

export const orgNameSchema = z.string().trim().min(2, "Use at least 2 characters").max(60);

export const createOrganizationSchema = z.object({ name: orgNameSchema });
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

export const updateOrganizationSchema = z.object({
  organizationId: z.string().cuid(),
  name: orgNameSchema,
  slug: slugSchema,
});
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

export const deleteOrganizationSchema = z.object({
  organizationId: z.string().cuid(),
  confirmation: z.string(),
});

export const roleSchema = z.enum(ROLES);

export const inviteMemberSchema = z.object({
  organizationId: z.string().cuid(),
  email: emailSchema,
  role: roleSchema,
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  organizationId: z.string().cuid(),
  memberId: z.string().cuid(),
  role: roleSchema,
});

export const removeMemberSchema = z.object({
  organizationId: z.string().cuid(),
  memberId: z.string().cuid(),
});

export const revokeInvitationSchema = z.object({
  organizationId: z.string().cuid(),
  invitationId: z.string().cuid(),
});

export const acceptInvitationSchema = z.object({ token: z.string().min(16).max(128) });
