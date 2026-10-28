import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/features/auth/components/auth-card";
import { CheckInbox } from "@/features/auth/components/check-inbox";
import { VerifyEmailConfirm } from "@/features/auth/components/verify-email-confirm";
import { emailSchema } from "@/features/auth/schemas";

export const metadata: Metadata = { title: "Verify email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const params = await searchParams;
  const email = emailSchema.safeParse(params.email ?? "");

  return (
    <AuthCard
      title={params.token ? "Verify your email" : "Check your inbox"}
      footer={
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      {!email.success ? (
        <p className="text-center text-sm text-muted-foreground">This verification link is incomplete.</p>
      ) : params.token ? (
        <VerifyEmailConfirm email={email.data} token={params.token} />
      ) : (
        <CheckInbox email={email.data} />
      )}
    </AuthCard>
  );
}
