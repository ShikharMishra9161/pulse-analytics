"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const SECTION_LABELS: Record<string, string> = {
  events: "Events",
  live: "Live",
  "api-keys": "API keys",
  settings: "Settings",
  members: "Members",
};

export function Breadcrumbs({
  org,
  projects,
}: {
  org: { name: string; slug: string };
  projects: { id: string; name: string }[];
}) {
  const pathname = usePathname();
  const base = `/o/${org.slug}`;
  const rest = pathname.slice(base.length).split("/").filter(Boolean);

  const crumbs: { label: string; href: string }[] = [{ label: org.name, href: base }];
  let href = base;
  for (let i = 0; i < rest.length; i++) {
    const segment = rest[i]!;
    href += `/${segment}`;
    if (segment === "projects") continue;
    if (rest[i - 1] === "projects") {
      crumbs.push({ label: projects.find((p) => p.id === segment)?.name ?? "Project", href });
    } else {
      crumbs.push({ label: SECTION_LABELS[segment] ?? segment, href });
    }
  }

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {crumbs.map((c, i) => (
          <Fragment key={c.href}>
            {i > 0 && <BreadcrumbSeparator className="hidden sm:block" />}
            <BreadcrumbItem className={i < crumbs.length - 1 ? "hidden min-w-0 sm:inline-flex" : "min-w-0"}>
              {i === crumbs.length - 1 ? (
                <BreadcrumbPage className="truncate">{c.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={c.href} className="truncate">
                    {c.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
