"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Loader2, UserPlus } from "lucide-react";
import { TextField } from "@/components/form-field";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { handleResult } from "@/lib/form";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "@/lib/permissions";
import { inviteMemberAction } from "../actions";
import { inviteMemberSchema, type InviteMemberInput } from "../schemas";

export function InviteMemberDialog({ organizationId, roles }: { organizationId: string; roles: Role[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const form = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { organizationId, email: "", role: roles.includes("MEMBER") ? "MEMBER" : roles[0] },
  });
  const role = form.watch("role");

  async function onSubmit(values: InviteMemberInput) {
    const invitation = handleResult(await inviteMemberAction(values), {
      setError: form.setError,
      success: `Invitation sent to ${values.email}`,
    });
    if (!invitation) return;
    router.refresh();
    if (invitation.devInviteUrl) setDevUrl(invitation.devInviteUrl);
    else close();
  }

  function close() {
    setOpen(false);
    setDevUrl(null);
    setCopied(false);
    form.reset();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> Invite member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {devUrl ? (
          <>
            <DialogHeader>
              <DialogTitle>Invitation sent</DialogTitle>
              <DialogDescription>
                Email delivery is mocked in development. Share this link with the invitee — it only works for their email
                address.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-2">
              <code className="min-w-0 flex-1 truncate text-xs">{devUrl}</code>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Copy link"
                onClick={async () => {
                  await navigator.clipboard.writeText(devUrl);
                  setCopied(true);
                }}
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={close}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <DialogHeader>
              <DialogTitle>Invite a teammate</DialogTitle>
              <DialogDescription>They&apos;ll get an email with a link to join. Invitations expire after 7 days.</DialogDescription>
            </DialogHeader>
            <FieldGroup className="py-5">
              <TextField control={form.control} name="email" label="Email" type="email" placeholder="teammate@company.com" autoFocus />
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="invite-role">Role</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="invite-role" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {role && <FieldDescription>{ROLE_DESCRIPTIONS[role]}</FieldDescription>}
                  </Field>
                )}
              />
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                Send invitation
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
