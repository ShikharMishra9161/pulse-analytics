import type { Metadata } from "next";
import Link from "next/link";
import { MailX } from "lucide-react";
import { SimpleShell } from "@/components/simple-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AcceptInviteButton } from "@/features/organizations/components/accept-invite-button";
import { getInvitationByToken } from "@/features/organizations/service";
import { ROLE_LABELS } from "@/lib/permissions";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Invitation" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [lookup, user] = await Promise.all([getInvitationByToken(token), getCurrentUser()]);

  if (lookup.status !== "pending") {
    return (
      <SimpleShell>
        <Card className="h-fit w-full max-w-md text-center shadow-sm">
          <CardHeader className="items-center">
            <MailX className="mx-auto mb-2 size-8 text-muted-foreground" />
            <CardTitle>
              {lookup.status === "expired" ? "Invitation expired" : lookup.status === "accepted" ? "Already accepted" : "Invalid invitation"}
            </CardTitle>
            <CardDescription>
              {lookup.status === "accepted"
                ? "This invitation has already been used."
                : "Ask an admin of the organization to send you a new invitation."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </SimpleShell>
    );
  }

  const { invitation } = lookup;
  const callbackUrl = `/invite/${token}`;
  const emailMatches = user && user.email.toLowerCase() === invitation.email.toLowerCase();

  return (
    <SimpleShell>
      <Card className="h-fit w-full max-w-md shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground">
            {invitation.organization.name.slice(0, 2).toUpperCase()}
          </div>
          <CardTitle className="text-xl">Join {invitation.organization.name}</CardTitle>
          <CardDescription>
            {invitation.invitedBy?.name ?? invitation.invitedBy?.email ?? "A teammate"} invited{" "}
            <span className="font-medium text-foreground">{invitation.email}</span> to join as{" "}
            <span className="font-medium text-foreground">{ROLE_LABELS[invitation.role]}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!user ? (
            <>
              <Button asChild size="lg">
                <Link href={`/login?${new URLSearchParams({ callbackUrl })}`}>Sign in to accept</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/register">Create an account</Link>
              </Button>
            </>
          ) : emailMatches ? (
            <AcceptInviteButton token={token} />
          ) : (
            <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
              You&apos;re signed in as <span className="font-medium text-foreground">{user.email}</span>. Sign in with{" "}
              {invitation.email} to accept this invitation.
            </p>
          )}
        </CardContent>
      </Card>
    </SimpleShell>
  );
}
