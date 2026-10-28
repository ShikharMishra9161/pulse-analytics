"use client";

import Link from "next/link";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { ROLE_LABELS, type Role } from "@/lib/permissions";

export type OrgOption = { id: string; name: string; slug: string; role: Role };

export function OrgAvatar({ name }: { name: string }) {
  return (
    <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export function OrgSwitcher({ current, orgs }: { current: OrgOption; orgs: OrgOption[] }) {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <OrgAvatar name={current.name} />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{current.name}</span>
                <span className="truncate text-xs text-muted-foreground">{ROLE_LABELS[current.role]}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56" align="start" sideOffset={4}>
            <DropdownMenuLabel className="text-xs text-muted-foreground">Organizations</DropdownMenuLabel>
            {orgs.map((o) => (
              <DropdownMenuItem key={o.id} asChild>
                <Link href={`/o/${o.slug}`} className="gap-2">
                  <span className="flex size-6 items-center justify-center rounded-md border text-[10px] font-semibold">
                    {o.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="flex-1 truncate">{o.name}</span>
                  {o.id === current.id && <Check className="size-4" />}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/onboarding" className="gap-2">
                <span className="flex size-6 items-center justify-center rounded-md border border-dashed">
                  <Plus className="size-3.5" />
                </span>
                New organization
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
