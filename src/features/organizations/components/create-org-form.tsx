"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { TextField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { handleResult } from "@/lib/form";
import { createOrganizationAction } from "../actions";
import { createOrganizationSchema, type CreateOrganizationInput } from "../schemas";

export function CreateOrgForm() {
  const router = useRouter();
  const form = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(values: CreateOrganizationInput) {
    const org = handleResult(await createOrganizationAction(values), {
      setError: form.setError,
      success: "Organization created",
    });
    if (org) router.push(`/o/${org.slug}`);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <TextField
          control={form.control}
          name="name"
          label="Organization name"
          placeholder="Acme Inc"
          autoFocus
          description="Usually your company or team name. You can change it later."
        />
        <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
          Create organization
        </Button>
      </FieldGroup>
    </form>
  );
}
