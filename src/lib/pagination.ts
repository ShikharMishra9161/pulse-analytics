import { z } from "zod";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const pageParamsSchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).catch(DEFAULT_PAGE_SIZE),
});
export type PageParams = z.infer<typeof pageParamsSchema>;

export type Paginated<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};

export function parsePageParams(input: { page?: string | string[]; pageSize?: string | string[] }, pageSize = DEFAULT_PAGE_SIZE): PageParams {
  return pageParamsSchema.parse({ page: first(input.page), pageSize: first(input.pageSize) ?? pageSize });
}

export function paginate<T>(items: T[], total: number, { page, pageSize }: PageParams): Paginated<T> {
  return { items, page, pageSize, total, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export const skipTake = ({ page, pageSize }: PageParams) => ({ skip: (page - 1) * pageSize, take: pageSize });

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
