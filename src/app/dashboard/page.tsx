import { redirect } from "next/navigation";
import { listUserOrganizations } from "@/features/organizations/service";
import { requireUser } from "@/server/session";

/** Entry point after sign-in: go to the user's first organization, or onboarding. */
export default async function DashboardRedirect() {
  const user = await requireUser();
  const orgs = await listUserOrganizations(user.id);
  redirect(orgs[0] ? `/o/${orgs[0].slug}` : "/onboarding");
}
