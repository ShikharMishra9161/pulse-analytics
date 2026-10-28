"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown, FolderKanban } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export type ProjectOption = { id: string; name: string };

export function ProjectSwitcher({
  orgSlug,
  current,
  projects,
}: {
  orgSlug: string;
  current: ProjectOption;
  projects: ProjectOption[];
}) {
  const pathname = usePathname();
  // Keep the same sub-page (events, live…) when switching projects.
  const subPath = pathname.replace(/^\/o\/[^/]+\/projects\/[^/]+/, "");

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="border bg-background shadow-xs data-[state=open]:bg-sidebar-accent" tooltip={current.name}>
              <FolderKanban />
              <span className="truncate font-medium">{current.name}</span>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-52" align="start">
            {projects.map((p) => (
              <DropdownMenuItem key={p.id} asChild>
                <Link href={`/o/${orgSlug}/projects/${p.id}${subPath}`}>
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.id === current.id && <Check className="size-4" />}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/o/${orgSlug}`}>All projects</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
