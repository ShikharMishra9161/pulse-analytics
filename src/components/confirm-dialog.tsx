"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Destructive-action confirmation. With `confirmText`, the user must type it
 * exactly (GitHub-style) before the action button enables.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  actionLabel,
  confirmText,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: React.ReactNode;
  actionLabel: string;
  confirmText?: string;
  /** Return true to close the dialog. */
  onConfirm: (typed: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();
  const blocked = confirmText !== undefined && typed !== confirmText;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTyped("");
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {confirmText !== undefined && (
          <div className="space-y-2">
            <Label htmlFor="confirm-text" className="font-normal text-muted-foreground">
              Type <span className="font-mono font-medium text-foreground">{confirmText}</span> to confirm
            </Label>
            <Input id="confirm-text" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={blocked || pending}
            onClick={() =>
              startTransition(async () => {
                if (await onConfirm(typed)) setOpen(false);
              })
            }
          >
            {pending && <Loader2 className="animate-spin" />}
            {actionLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
