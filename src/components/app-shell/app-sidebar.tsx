"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  FolderKanban,
  KeyRound,
  ListTree,
  Settings,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { can, type Role } from "@/lib/permissions";
import { OrgSwitcher, type OrgOption } from "./org-switcher";
import { ProjectSwitcher, type ProjectOption } from "./project-switcher";
import { UserMenu, type UserMenuUser } from "./user-menu";

type NavItem = { title: string; href: string; icon: typeof Activity; exact?: boolean };

export function AppSidebar({
  org,
  role,
  orgs,
  projects,
  user,
}: {
  org: OrgOption;
  role: Role;
  orgs: OrgOption[];
  projects: ProjectOption[];
  user: UserMenuUser;
}) {
  const pathname = usePathname();
  const base = `/o/${org.slug}`;
  const projectId = pathname.match(/^\/o\/[^/]+\/projects\/([^/]+)/)?.[1];
  const currentProject = projects.find((p) => p.id === projectId);

  const orgNav: NavItem[] = [
    { title: "Projects", href: base, icon: FolderKanban, exact: true },
    { title: "Members", href: `${base}/settings/members`, icon: Users },
    { title: "Settings", href: `${base}/settings`, icon: Settings, exact: true },
  ];

  const projectBase = currentProject ? `${base}/projects/${currentProject.id}` : null;
  const projectNav: NavItem[] = projectBase
    ? [
        { title: "Overview", href: projectBase, icon: BarChart3, exact: true },
        { title: "Events", href: `${projectBase}/events`, icon: ListTree },
        { title: "Live", href: `${projectBase}/live`, icon: Activity },
        ...(can(role, "apikey:read") ? [{ title: "API keys", href: `${projectBase}/api-keys`, icon: KeyRound }] : []),
        ...(can(role, "project:update")
          ? [{ title: "Project settings", href: `${projectBase}/settings`, icon: SlidersHorizontal }]
          : []),
      ]
    : [];

  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname.startsWith(item.href));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <OrgSwitcher current={org} orgs={orgs} />
      </SidebarHeader>
      <SidebarContent>
        {projectBase && currentProject && (
          <SidebarGroup>
            <SidebarGroupLabel>Project</SidebarGroupLabel>
            <ProjectSwitcher orgSlug={org.slug} current={currentProject} projects={projects} />
            <SidebarMenu className="mt-1">
              {projectNav.map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item)} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Organization</SidebarGroupLabel>
          <SidebarMenu>
            {orgNav.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(item)} />
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
        <Link href={item.href}>
          <item.icon />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
