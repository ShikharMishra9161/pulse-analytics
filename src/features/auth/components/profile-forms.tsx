"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import type { z } from "zod";
import { TextField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { handleResult } from "@/lib/form";
import { changePasswordAction, updateProfileAction } from "../actions";
import { changePasswordSchema, updateProfileSchema } from "../schemas";

type ProfileInput = z.infer<typeof updateProfileSchema>;
type PasswordInput = z.input<typeof changePasswordSchema>;

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const form = useForm<ProfileInput>({ resolver: zodResolver(updateProfileSchema), defaultValues: { name } });

  async function onSubmit(values: ProfileInput) {
    if (handleResult(await updateProfileAction(values), { setError: form.setError, success: "Profile updated" })) {
      form.reset(values);
      router.refresh();
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>How you appear to teammates.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="max-w-md">
            <TextField control={form.control} name="name" label="Full name" autoComplete="name" />
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={email} disabled readOnly />
            </div>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button type="submit" disabled={!form.formState.isDirty || form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const form = useForm<PasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: PasswordInput) {
    if (handleResult(await changePasswordAction(values), { setError: form.setError, success: "Password updated" })) {
      form.reset();
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>{hasPassword ? "Change password" : "Set a password"}</CardTitle>
          <CardDescription>
            {hasPassword ? "Use a strong password you don't use elsewhere." : "Add a password to sign in with email as well as Google."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="max-w-md">
            {hasPassword && (
              <TextField control={form.control} name="currentPassword" label="Current password" type="password" autoComplete="current-password" />
            )}
            <TextField control={form.control} name="newPassword" label="New password" type="password" autoComplete="new-password" />
            <TextField control={form.control} name="confirmPassword" label="Confirm new password" type="password" autoComplete="new-password" />
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            Update password
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
