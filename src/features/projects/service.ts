import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { paginate, skipTake, type PageParams } from "@/lib/pagination";

export type ProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  activeKeys: number;
  events24h: number;
};

export async function listProjects(organizationId: string, params: PageParams) {
  const where = { organizationId };
  const [rows, total] = await Promise.all([
    db.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...skipTake(params),
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        _count: { select: { apiKeys: { where: { revokedAt: null } } } },
      },
    }),
    db.project.count({ where }),
  ]);

  // One indexed aggregate for the whole page instead of N count queries.
  const ids = rows.map((r) => r.id);
  const counts = ids.length
    ? await db.$queryRaw<{ projectId: string; count: bigint }[]>`
        SELECT "projectId", COUNT(*)::bigint AS count
        FROM events
        WHERE "projectId" IN (${Prisma.join(ids)})
          AND "timestamp" >= NOW() - INTERVAL '24 hours'
        GROUP BY "projectId"`
    : [];
  const byId = new Map(counts.map((c) => [c.projectId, Number(c.count)]));

  const items: ProjectListItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    createdAt: r.createdAt,
    activeKeys: r._count.apiKeys,
    events24h: byId.get(r.id) ?? 0,
  }));
  return paginate(items, total, params);
}

export async function listProjectOptions(organizationId: string) {
  return db.project.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    take: 100,
    select: { id: true, name: true },
  });
}

export async function createProject(organizationId: string, input: { name: string; description?: string }) {
  return db.project.create({
    data: { organizationId, name: input.name, description: input.description ?? null },
    select: { id: true, name: true },
  });
}

export async function updateProject(projectId: string, input: { name: string; description?: string }) {
  return db.project.update({
    where: { id: projectId },
    data: { name: input.name, description: input.description ?? null },
    select: { id: true, name: true },
  });
}

export async function deleteProject(projectId: string, confirmation: string) {
  const project = await db.project.findUniqueOrThrow({ where: { id: projectId }, select: { name: true } });
  if (confirmation !== project.name) {
    throw new AppError("VALIDATION_ERROR", "Confirmation doesn't match.", {
      confirmation: [`Type "${project.name}" to confirm.`],
    });
  }
  // Cascades to events, users and keys. For very large projects this should move to a background job.
  await db.project.delete({ where: { id: projectId } });
}
