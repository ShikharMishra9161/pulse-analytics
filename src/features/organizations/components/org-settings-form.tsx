"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { TextField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { handleResult } from "@/lib/form";
import { updateOrganizationAction } from "../actions";
import { updateOrganizationSchema, type UpdateOrganizationInput } from "../schemas";

export function OrgSettingsForm({ org, disabled }: { org: { id: string; name: string; slug: string }; disabled: boolean }) {
  const router = useRouter();
  const form = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: { organizationId: org.id, name: org.name, slug: org.slug },
  });

  async function onSubmit(values: UpdateOrganizationInput) {
    const updated = handleResult(await updateOrganizationAction(values), {
      setError: form.setError,
      success: "Organization updated",
    });
    if (!updated) return;
    form.reset(values);
    if (updated.slug !== org.slug) router.replace(`/o/${updated.slug}/settings`);
    else router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Your organization&apos;s display name and URL.</CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset disabled={disabled}>
            <FieldGroup className="max-w-md">
              <TextField control={form.control} name="name" label="Name" />
              <TextField
                control={form.control}
                name="slug"
                label="URL"
                description={`/o/${form.watch("slug") || "…"} — changing it breaks existing links.`}
              />
            </FieldGroup>
          </fieldset>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button type="submit" disabled={disabled || !form.formState.isDirty || form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            Save changes
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
