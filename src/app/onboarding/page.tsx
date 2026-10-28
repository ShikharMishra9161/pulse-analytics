import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { SimpleShell } from "@/components/simple-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateOrgForm } from "@/features/organizations/components/create-org-form";
import { listUserOrganizations } from "@/features/organizations/service";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Create organization" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const orgs = await listUserOrganizations(user.id);
  const first = orgs.length === 0;

  return (
    <SimpleShell back={first ? undefined : { href: "/dashboard", label: "Back to dashboard" }}>
      <Card className="h-fit w-full max-w-md shadow-sm">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg border bg-muted/50">
            <Building2 className="size-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{first ? `Welcome${user.name ? `, ${user.name.split(" ")[0]}` : ""}!` : "New organization"}</CardTitle>
          <CardDescription>
            {first
              ? "Create an organization to get started. Projects, API keys and teammates all live inside it."
              : "Organizations keep projects, members and billing separate."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateOrgForm />
        </CardContent>
      </Card>
    </SimpleShell>
  );
}
