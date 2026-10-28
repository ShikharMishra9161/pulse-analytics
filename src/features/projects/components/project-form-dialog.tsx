"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { TextareaField, TextField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { handleResult } from "@/lib/form";
import { createProjectAction } from "../actions";
import { createProjectSchema, type CreateProjectInput } from "../schemas";

export function CreateProjectDialog({ organizationId, trigger }: { organizationId: string; trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { organizationId, name: "", description: "" },
  });

  async function onSubmit(values: CreateProjectInput) {
    const project = handleResult(await createProjectAction(values), {
      setError: form.setError,
      success: "Project created",
    });
    if (!project) return;
    setOpen(false);
    form.reset();
    router.push(`/o/${project.orgSlug}/projects/${project.id}/api-keys?welcome=1`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>A project is one app or website. Each has its own events and API keys.</DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-5">
            <TextField control={form.control} name="name" label="Name" placeholder="Marketing site" autoFocus />
            <TextareaField control={form.control} name="description" label="Description" placeholder="Optional" rows={3} />
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
