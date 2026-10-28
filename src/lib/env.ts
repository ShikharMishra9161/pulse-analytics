import "server-only";
import { z } from "zod";

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v : undefined));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_GOOGLE_ID: optionalString,
  AUTH_GOOGLE_SECRET: optionalString,
  UPSTASH_REDIS_REST_URL: optionalString,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  INGEST_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(600),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();

export const isGoogleAuthEnabled = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
export const isProduction = env.NODE_ENV === "production";
