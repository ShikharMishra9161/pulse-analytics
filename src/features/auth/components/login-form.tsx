"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { TextField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { loginAction } from "../actions";
import { loginSchema, type LoginInput } from "../schemas";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [error, setError] = useState<{ message: string; unverified: boolean } | null>(null);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", callbackUrl },
  });

  async function onSubmit(values: LoginInput) {
    setError(null);
    // Resolves only on failure; success redirects.
    const result = await loginAction(values);
    if (!result.ok) setError({ message: result.error.message, unverified: result.error.code === "FORBIDDEN" });
  }

  const email = form.watch("email");

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {error && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>
              {error.message}
              {error.unverified && (
                <Link
                  href={`/verify-email?${new URLSearchParams({ email })}`}
                  className="mt-1 block font-medium underline underline-offset-4"
                >
                  Resend verification email
                </Link>
              )}
            </AlertDescription>
          </Alert>
        )}
        <TextField control={form.control} name="email" label="Email" type="email" autoComplete="email" placeholder="you@company.com" autoFocus />
        <TextField control={form.control} name="password" label="Password" type="password" autoComplete="current-password" />
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
          Sign in
        </Button>
      </FieldGroup>
    </form>
  );
}
