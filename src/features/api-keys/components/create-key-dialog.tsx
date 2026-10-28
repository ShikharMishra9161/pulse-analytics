"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { TextField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Label } from "@/components/ui/label";
import { handleResult } from "@/lib/form";
import { createApiKeyAction } from "../actions";
import { createApiKeySchema, type CreateApiKeyInput } from "../schemas";

type CreatedKey = { name: string; publicKey: string; secretKey: string };

export function CreateKeyDialog({ projectId, defaultOpen = false }: { projectId: string; defaultOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const form = useForm<CreateApiKeyInput>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: { projectId, name: defaultOpen ? "Production" : "" },
  });

  async function onSubmit(values: CreateApiKeyInput) {
    const key = handleResult(await createApiKeyAction(values), { setError: form.setError, success: "API key created" });
    if (!key) return;
    setCreated(key);
    router.refresh();
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setCreated(null);
      form.reset({ projectId, name: "" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> New API key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg" onInteractOutside={(e) => created && e.preventDefault()}>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Save your secret key</DialogTitle>
              <DialogDescription>
                &ldquo;{created.name}&rdquo; is ready. Copy the secret now — for your security it won&apos;t be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <KeyField label="Public key" hint="Safe to use in browsers and mobile apps." value={created.publicKey} />
              <KeyField label="Secret key" hint="Server-side only. Never commit or ship it to clients." value={created.secretKey} secret />
              <Alert>
                <AlertTriangle />
                <AlertDescription>If you lose the secret, revoke this key and create a new one.</AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>I&apos;ve saved it</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>Keys authenticate requests to the ingestion API for this project.</DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-5">
              <TextField control={form.control} name="name" label="Name" placeholder="Production" autoFocus description="Helps you recognise where the key is used." />
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                Create key
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function KeyField({ label, hint, value, secret }: { label: string; hint: string; value: string; secret?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className={`flex items-center gap-2 rounded-lg border p-1 pl-3 ${secret ? "border-amber-500/40 bg-amber-500/5" : "bg-muted/50"}`}>
        <code className="min-w-0 flex-1 truncate font-mono text-xs">{value}</code>
        <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
