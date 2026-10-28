import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { unauthorized } from "@/lib/errors";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: Date | null;
  hasPassword: boolean;
};

/**
 * The signed-in user, re-read from the database once per request so deleted
 * users lose access immediately even though sessions are JWTs.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, image: true, emailVerified: true, passwordHash: true },
  });
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return { ...rest, hasPassword: passwordHash !== null };
});

/** For pages/layouts: redirects to /login when signed out. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For server actions and route handlers: throws a 401 AppError when signed out. */
export async function authenticate(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}
