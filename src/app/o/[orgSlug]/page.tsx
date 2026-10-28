import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, FolderKanban, KeyRound, Plus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationNav } from "@/components/pagination-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateProjectDialog } from "@/features/projects/components/project-form-dialog";
import { listProjects } from "@/features/projects/service";
import { formatCompact, formatRelative } from "@/lib/format";
import { parsePageParams } from "@/lib/pagination";
import { can } from "@/lib/permissions";
import { requireOrgPage } from "@/server/access";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { orgSlug } = await params;
  const ctx = await requireOrgPage(orgSlug);
  const pageParams = parsePageParams(await searchParams, 12);
  const projects = await listProjects(ctx.org.id, pageParams);
  const canCreate = can(ctx.role, "project:create");

  const createButton = canCreate ? (
    <CreateProjectDialog
      organizationId={ctx.org.id}
      trigger={
        <Button>
          <Plus /> New project
        </Button>
      }
    />
  ) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description={`All projects in ${ctx.org.name}.`} actions={createButton} />

      {projects.total === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description={
            canCreate
              ? "Create your first project to get an API key and start sending events."
              : "Ask an admin to create a project — you'll see it here."
          }
          action={createButton}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {projects.items.map((p) => (
              <Link key={p.id} href={`/o/${orgSlug}/projects/${p.id}`} className="group rounded-xl focus-visible:outline-2">
                <Card className="h-full transition-colors group-hover:border-foreground/20">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-sm font-semibold">
                          {p.name.slice(0, 1).toUpperCase()}
                        </div>
                        <CardTitle className="truncate text-base">{p.name}</CardTitle>
                      </div>
                      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <CardDescription className="line-clamp-2 min-h-10">{p.description ?? "No description"}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      <span className="tabular font-medium text-foreground">{formatCompact(p.events24h)}</span> events · 24h
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <KeyRound className="size-3" /> {p.activeKeys} · created {formatRelative(p.createdAt)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <PaginationNav {...projects} noun="projects" hrefFor={(page) => `/o/${orgSlug}?page=${page}`} />
        </>
      )}
    </div>
  );
}
