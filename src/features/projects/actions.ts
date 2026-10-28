"use server";

import { revalidatePath } from "next/cache";
import { createAction } from "@/lib/action";
import { authorizeOrg, authorizeProject } from "@/server/access";
import { invalidateKeyCache } from "@/features/api-keys/service";
import { createProjectSchema, deleteProjectSchema, updateProjectSchema } from "./schemas";
import { createProject, deleteProject, updateProject } from "./service";

export const createProjectAction = createAction(createProjectSchema, async (input) => {
  const ctx = await authorizeOrg(input.organizationId, "project:create");
  const project = await createProject(ctx.org.id, input);
  revalidatePath(`/o/${ctx.org.slug}`, "layout");
  return { ...project, orgSlug: ctx.org.slug };
});

export const updateProjectAction = createAction(updateProjectSchema, async (input) => {
  const ctx = await authorizeProject(input.projectId, "project:update");
  const project = await updateProject(ctx.project.id, input);
  revalidatePath(`/o/${ctx.org.slug}`, "layout");
  return project;
});

export const deleteProjectAction = createAction(deleteProjectSchema, async (input) => {
  const ctx = await authorizeProject(input.projectId, "project:delete");
  await deleteProject(ctx.project.id, input.confirmation);
  invalidateKeyCache();
  revalidatePath(`/o/${ctx.org.slug}`, "layout");
  return { orgSlug: ctx.org.slug };
});
