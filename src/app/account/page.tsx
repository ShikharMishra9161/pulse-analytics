import type { Metadata } from "next";
import { SimpleShell } from "@/components/simple-shell";
import { PageHeader } from "@/components/page-header";
import { PasswordForm, ProfileForm } from "@/features/auth/components/profile-forms";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Profile settings" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <SimpleShell back={{ href: "/dashboard", label: "Back to dashboard" }}>
      <div className="w-full max-w-2xl space-y-6">
        <PageHeader title="Profile settings" description="Manage your personal account." />
        <ProfileForm name={user.name ?? ""} email={user.email} />
        <PasswordForm hasPassword={user.hasPassword} />
      </div>
    </SimpleShell>
  );
}
