import { after, type NextRequest } from "next/server";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { ingestRateLimit, rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { validationError } from "@/lib/validation";
import { recordKeyUsage, resolveApiKey } from "@/features/api-keys/service";
import { ingestEvents } from "@/features/events/ingest";
import { MAX_BODY_BYTES, parseIngestBody } from "@/features/events/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public ingestion endpoint. Authenticated by API key, never by cookies,
 * so it is safe to allow any origin (no ambient credentials → no CSRF).
 */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Api-Key",
  "Access-Control-Max-Age": "86400",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function headerKey(req: NextRequest): string | null {
  const authorization = req.headers.get("authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) return authorization.slice(7).trim();
  return req.headers.get("x-api-key");
}

export async function POST(req: NextRequest) {
  let headers: Record<string, string> = { ...CORS_HEADERS };
  try {
    const declaredLength = Number(req.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_BODY_BYTES) throw new AppError("PAYLOAD_TOO_LARGE", "Request body exceeds 512KB.");

    const text = await req.text();
    if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw new AppError("PAYLOAD_TOO_LARGE", "Request body exceeds 512KB.");

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      throw new AppError("BAD_REQUEST", "Request body must be valid JSON.");
    }

    // Header first; body `api_key` exists for navigator.sendBeacon, which can't set headers.
    const bodyKey =
      json && typeof json === "object" && "api_key" in json && typeof json.api_key === "string" ? json.api_key : null;
    const apiKey = await resolveApiKey(headerKey(req) ?? bodyKey);
    if (!apiKey) throw new AppError("UNAUTHORIZED", "Missing or invalid API key.");

    const limit = await rateLimit(ingestRateLimit(), apiKey.id);
    headers = { ...headers, ...rateLimitHeaders(limit) };
    if (!limit.success) throw new AppError("RATE_LIMITED", "Rate limit exceeded. Slow down and retry later.");

    const parsed = parseIngestBody(json);
    if (!parsed.success) throw validationError(parsed.error, "Invalid event payload.");

    const result = await ingestEvents(apiKey.projectId, parsed.events);

    after(() => recordKeyUsage(apiKey.id).catch((err) => console.error("[ingest] usage tracking failed", err)));
    return apiSuccess(result, { status: 202, headers });
  } catch (err) {
    return handleRouteError(err, { headers });
  }
}
