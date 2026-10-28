import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { getLiveSnapshot } from "@/features/analytics/queries";
import { authorizeProject } from "@/server/access";

export const dynamic = "force-dynamic";

/** Session-authenticated (cookie) read endpoint polled by the Live page. Same-origin only. */
export async function GET(_req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;
    const ctx = await authorizeProject(projectId, "analytics:read");
    const snapshot = await getLiveSnapshot(ctx.project.id);
    return apiSuccess(snapshot, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleRouteError(err);
  }
}
