"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { TextField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { handleResult } from "@/lib/form";
import { registerAction } from "../actions";
import { registerSchema, type RegisterInput } from "../schemas";
import { CheckInbox } from "./check-inbox";

export function RegisterForm() {
  const [sent, setSent] = useState<{ email: string; devUrl?: string } | null>(null);
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: RegisterInput) {
    const data = handleResult(await registerAction(values), { setError: form.setError });
    if (data) setSent({ email: values.email, devUrl: data.devVerificationUrl });
  }

  if (sent) return <CheckInbox email={sent.email} devUrl={sent.devUrl} />;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <TextField control={form.control} name="name" label="Full name" autoComplete="name" placeholder="Ada Lovelace" autoFocus />
        <TextField control={form.control} name="email" label="Work email" type="email" autoComplete="email" placeholder="you@company.com" />
        <TextField
          control={form.control}
          name="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          description="At least 8 characters, with a letter and a number."
        />
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
          Create account
        </Button>
      </FieldGroup>
    </form>
  );
}
