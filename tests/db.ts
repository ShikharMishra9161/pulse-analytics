import { db } from "@/lib/db";

/** Wipes every application table. Only ever runs against TEST_DATABASE_URL (see tests/env.ts). */
export async function resetDatabase() {
  await db.$executeRawUnsafe(`
    TRUNCATE TABLE events, project_users, api_keys, projects, invitations,
      organization_members, organizations, verification_tokens, sessions, accounts, users
    RESTART IDENTITY CASCADE`);
}

export async function createUser(email: string, opts: { verified?: boolean; name?: string } = {}) {
  return db.user.create({
    data: { email, name: opts.name ?? email.split("@")[0], emailVerified: opts.verified === false ? null : new Date() },
  });
}

export { db };
