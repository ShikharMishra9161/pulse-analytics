import { z } from "zod";

const name = z.string().trim().min(2, "Use at least 2 characters").max(60);
const description = z
  .string()
  .trim()
  .max(280, "Keep it under 280 characters")
  .optional()
  .transform((v) => (v ? v : undefined));

export const createProjectSchema = z.object({
  organizationId: z.string().cuid(),
  name,
  description,
});
export type CreateProjectInput = z.input<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  projectId: z.string().cuid(),
  name,
  description,
});
export type UpdateProjectInput = z.input<typeof updateProjectSchema>;

export const deleteProjectSchema = z.object({
  projectId: z.string().cuid(),
  confirmation: z.string(),
});
