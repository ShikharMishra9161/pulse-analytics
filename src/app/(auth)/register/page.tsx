import type { Metadata } from "next";
import Link from "next/link";
import { googleEnabled } from "@/auth.config";
import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthDivider, GoogleButton } from "@/features/auth/components/google-button";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Start tracking events in minutes"
      footer={
        <span>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      {googleEnabled && (
        <>
          <GoogleButton label="Sign up with Google" />
          <AuthDivider />
        </>
      )}
      <RegisterForm />
    </AuthCard>
  );
}
