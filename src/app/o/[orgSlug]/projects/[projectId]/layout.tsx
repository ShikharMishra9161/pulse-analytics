import { requireProjectPage } from "@/server/access";

/** Verifies membership + project ownership once for every project sub-page. */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; projectId: string }>;
}) {
  const { orgSlug, projectId } = await params;
  await requireProjectPage(orgSlug, projectId);
  return children;
}
