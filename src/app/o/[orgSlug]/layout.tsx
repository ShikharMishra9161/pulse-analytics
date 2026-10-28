import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { listUserOrganizations } from "@/features/organizations/service";
import { listProjectOptions } from "@/features/projects/service";
import { requireOrgPage } from "@/server/access";
import { Breadcrumbs } from "@/components/app-shell/breadcrumbs";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrgPage(orgSlug);
  const [orgs, projects, cookieStore] = await Promise.all([
    listUserOrganizations(ctx.user.id),
    listProjectOptions(ctx.org.id),
    cookies(),
  ]);
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        org={{ ...ctx.org, role: ctx.role }}
        role={ctx.role}
        orgs={orgs}
        projects={projects}
        user={{ name: ctx.user.name, email: ctx.user.email, image: ctx.user.image }}
      />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
          <Breadcrumbs org={ctx.org} projects={projects} />
        </header>
        <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
