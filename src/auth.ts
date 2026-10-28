import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { authenticateCredentials } from "@/features/auth/service";
import { loginSchema } from "@/features/auth/schemas";
import { clientIp } from "@/lib/request";
import { authConfig } from "./auth.config";

class InvalidCredentials extends CredentialsSignin {
  code = "invalid_credentials";
}
class EmailNotVerified extends CredentialsSignin {
  code = "email_not_verified";
}
class TooManyAttempts extends CredentialsSignin {
  code = "rate_limited";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) throw new InvalidCredentials();
        const { email, password } = parsed.data;

        const limit = await rateLimit(RATE_LIMITS.login, `${clientIp(request.headers)}:${email}`);
        if (!limit.success) throw new TooManyAttempts();

        const outcome = await authenticateCredentials(email, password);
        if (!outcome.ok) {
          throw outcome.reason === "email_not_verified" ? new EmailNotVerified() : new InvalidCredentials();
        }
        return outcome.user;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    signIn({ account, profile }) {
      // Only accept Google accounts whose email Google has verified.
      if (account?.provider === "google") return profile?.email_verified === true;
      return true;
    },
  },
  events: {
    // Google has already verified the address; mark it verified for OAuth sign-ups.
    async linkAccount({ user, account }) {
      if (account.provider === "google" && user.id) {
        await db.user.updateMany({
          where: { id: user.id, emailVerified: null },
          data: { emailVerified: new Date() },
        });
      }
    },
  },
});
