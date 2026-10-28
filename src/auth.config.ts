import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/** Route prefixes that require a session. */
const PROTECTED_PREFIXES = ["/o/", "/dashboard", "/onboarding", "/account"];
/** Auth pages a signed-in user shouldn't see. */
const GUEST_ONLY = ["/login", "/register"];

export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

/**
 * Edge-safe Auth.js config (no Prisma, no bcrypt) shared by middleware and the
 * full server config in `auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify-email",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh daily
  },
  providers: googleEnabled ? [Google({ allowDangerousEmailAccountLinking: false })] : [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const signedIn = Boolean(auth?.user);
      if (GUEST_ONLY.some((p) => pathname === p) && signedIn) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      if (PROTECTED_PREFIXES.some((p) => pathname === p.replace(/\/$/, "") || pathname.startsWith(p))) {
        return signedIn; // false → redirect to pages.signIn with callbackUrl
      }
      return true;
    },
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
