"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CopyButton } from "@/components/copy-button";
import { TextareaField, TextField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { handleResult } from "@/lib/form";
import { deleteProjectAction, updateProjectAction } from "../actions";
import { updateProjectSchema, type UpdateProjectInput } from "../schemas";

type Project = { id: string; name: string; description: string | null };

export function ProjectSettingsForm({ project }: { project: Project }) {
  const router = useRouter();
  const form = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: { projectId: project.id, name: project.name, description: project.description ?? "" },
  });

  async function onSubmit(values: UpdateProjectInput) {
    if (handleResult(await updateProjectAction(values), { setError: form.setError, success: "Project updated" })) {
      form.reset(values);
      router.refresh();
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Basic information about this project.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="max-w-md">
            <TextField control={form.control} name="name" label="Project name" />
            <TextareaField control={form.control} name="description" label="Description" rows={3} />
            <div className="space-y-1.5">
              <Label>Project ID</Label>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-1 pl-3">
                <code className="flex-1 truncate font-mono text-xs">{project.id}</code>
                <CopyButton value={project.id} label="Copy project ID" />
              </div>
            </div>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button type="submit" disabled={!form.formState.isDirty || form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            Save changes
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

export function DeleteProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle>Delete project</CardTitle>
        <CardDescription>Permanently delete this project, its API keys and every event it has received.</CardDescription>
      </CardHeader>
      <CardFooter className="justify-end border-t">
        <ConfirmDialog
          trigger={<Button variant="destructive">Delete project</Button>}
          title="Delete project"
          description={
            <>
              All events, users and API keys for <strong>{project.name}</strong> will be permanently deleted.
            </>
          }
          confirmText={project.name}
          actionLabel="Delete forever"
          onConfirm={async (typed) => {
            const result = await deleteProjectAction({ projectId: project.id, confirmation: typed });
            if (!result.ok) {
              toast.error(result.error.message);
              return false;
            }
            toast.success("Project deleted");
            router.push(`/o/${result.data.orgSlug}`);
            return true;
          }}
        />
      </CardFooter>
    </Card>
  );
}
