"use server";

import { revalidatePath } from "next/cache";
import { createAction } from "@/lib/action";
import { authorizeProject } from "@/server/access";
import { createApiKeySchema, revokeApiKeySchema } from "./schemas";
import { createApiKey, revokeApiKey } from "./service";

export const createApiKeyAction = createAction(createApiKeySchema, async (input) => {
  const ctx = await authorizeProject(input.projectId, "apikey:create");
  const key = await createApiKey({ projectId: ctx.project.id, name: input.name, createdById: ctx.user.id });
  revalidatePath(`/o/${ctx.org.slug}/projects/${ctx.project.id}`, "layout");
  return key;
});

export const revokeApiKeyAction = createAction(revokeApiKeySchema, async (input) => {
  const ctx = await authorizeProject(input.projectId, "apikey:revoke");
  await revokeApiKey(ctx.project.id, input.apiKeyId);
  revalidatePath(`/o/${ctx.org.slug}/projects/${ctx.project.id}`, "layout");
  return { revoked: true };
});
