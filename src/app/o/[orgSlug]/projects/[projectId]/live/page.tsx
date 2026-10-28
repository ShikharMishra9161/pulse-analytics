import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { LiveView } from "@/features/analytics/components/live-view";
import { getLiveSnapshot } from "@/features/analytics/queries";
import { requireProjectPage } from "@/server/access";

export const metadata: Metadata = { title: "Live" };

export default async function LivePage({ params }: { params: Promise<{ orgSlug: string; projectId: string }> }) {
  const { orgSlug, projectId } = await params;
  await requireProjectPage(orgSlug, projectId);
  const initial = await getLiveSnapshot(projectId);

  return (
    <div className="space-y-6">
      <PageHeader title="Live" description="What's happening in your product right now." />
      <LiveView projectId={projectId} initial={initial} />
    </div>
  );
}
