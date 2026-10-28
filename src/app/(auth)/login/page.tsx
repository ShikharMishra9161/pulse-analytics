import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { googleEnabled } from "@/auth.config";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthDivider, GoogleButton } from "@/features/auth/components/google-button";
import { LoginForm } from "@/features/auth/components/login-form";
import { safeRedirectPath } from "@/lib/url";

export const metadata: Metadata = { title: "Sign in" };

const OAUTH_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: "This email is already registered with a password. Sign in with your password instead.",
  AccessDenied: "Access denied. Your Google account email must be verified.",
  Configuration: "Sign-in is temporarily unavailable.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string; verified?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeRedirectPath(params.callbackUrl, "/dashboard");
  const oauthError = params.error ? (OAUTH_ERRORS[params.error] ?? "Sign-in failed. Please try again.") : null;

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your Pulse account"
      footer={
        <span>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign up
          </Link>
        </span>
      }
    >
      {params.verified && (
        <Alert className="mb-5">
          <CheckCircle2 />
          <AlertDescription>Email verified — you can sign in now.</AlertDescription>
        </Alert>
      )}
      {oauthError && (
        <Alert variant="destructive" className="mb-5">
          <AlertDescription>{oauthError}</AlertDescription>
        </Alert>
      )}
      {googleEnabled && (
        <>
          <GoogleButton callbackUrl={callbackUrl} />
          <AuthDivider />
        </>
      )}
      <LoginForm callbackUrl={callbackUrl} />
    </AuthCard>
  );
}
