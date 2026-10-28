import { z } from "zod";

export const createApiKeySchema = z.object({
  projectId: z.string().cuid(),
  name: z.string().trim().min(1, "Name is required").max(60),
});
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

export const revokeApiKeySchema = z.object({
  projectId: z.string().cuid(),
  apiKeyId: z.string().cuid(),
});
