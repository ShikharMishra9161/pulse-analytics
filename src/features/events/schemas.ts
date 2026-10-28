import { z } from "zod";

export const MAX_BATCH_SIZE = 100;
export const MAX_BODY_BYTES = 512 * 1024;
export const MAX_PROPERTIES_BYTES = 16 * 1024;
const MAX_PROPERTY_KEYS = 100;
const MAX_DEPTH = 5;
const MAX_FUTURE_SKEW_MS = 60 * 60 * 1000; // 1h of client clock skew
const MAX_PAST_MS = 365 * 24 * 60 * 60 * 1000; // 1 year of backfill

// Postgres TEXT/JSONB reject NUL; other control chars are almost always bugs.
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

const identifier = (label: string) =>
  z
    .string({ required_error: `${label} is required`, invalid_type_error: `${label} must be a string` })
    .trim()
    .min(1, `${label} is required`)
    .max(200, `${label} must be at most 200 characters`)
    .refine((v) => !CONTROL_CHARS.test(v), `${label} contains invalid characters`);

function depth(value: unknown, level = 0): number {
  if (level > MAX_DEPTH) return level;
  if (value && typeof value === "object") {
    let max = level;
    for (const v of Object.values(value)) max = Math.max(max, depth(v, level + 1));
    return max;
  }
  return level;
}

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
const jsonValue: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([z.string(), z.number().finite(), z.boolean(), z.null(), z.array(jsonValue), z.record(jsonValue)]),
);

export const propertiesSchema = z
  .record(jsonValue)
  .superRefine((props, ctx) => {
    const keys = Object.keys(props);
    if (keys.length > MAX_PROPERTY_KEYS) {
      ctx.addIssue({ code: "custom", message: `At most ${MAX_PROPERTY_KEYS} top-level properties allowed` });
    }
    if (keys.some((k) => k.length === 0 || k.length > 200)) {
      ctx.addIssue({ code: "custom", message: "Property keys must be 1-200 characters" });
    }
    if (depth(props) > MAX_DEPTH) {
      ctx.addIssue({ code: "custom", message: `Properties can be nested at most ${MAX_DEPTH} levels deep` });
    }
    const serialized = JSON.stringify(props);
    if (serialized.includes("\\u0000")) ctx.addIssue({ code: "custom", message: "Properties contain NUL characters" });
    if (new TextEncoder().encode(serialized).length > MAX_PROPERTIES_BYTES) {
      ctx.addIssue({ code: "custom", message: `Properties must be at most ${MAX_PROPERTIES_BYTES / 1024}KB` });
    }
  });

const timestampSchema = z
  .union([z.string().datetime({ offset: true, message: "timestamp must be an ISO-8601 date" }), z.number().int().positive()])
  .transform((v) => new Date(v))
  .refine((d) => !Number.isNaN(d.getTime()), "Invalid timestamp")
  .refine((d) => d.getTime() <= Date.now() + MAX_FUTURE_SKEW_MS, "timestamp is too far in the future")
  .refine((d) => d.getTime() >= Date.now() - MAX_PAST_MS, "timestamp is older than 1 year");

export const eventSchema = z
  .object({
    event: identifier("event"),
    distinctId: identifier("distinctId"),
    timestamp: timestampSchema.optional(),
    properties: propertiesSchema.optional().default({}),
  })
  .strict();

export type IncomingEvent = z.output<typeof eventSchema>;

const singleBodySchema = eventSchema.extend({ api_key: z.string().optional() }).strict();

const batchBodySchema = z
  .object({
    batch: z
      .array(eventSchema, { invalid_type_error: "batch must be an array" })
      .min(1, "batch must contain at least one event")
      .max(MAX_BATCH_SIZE, `batch can contain at most ${MAX_BATCH_SIZE} events`),
    api_key: z.string().optional(),
  })
  .strict();

/**
 * Accepts a single event or `{ batch: [...] }`. Optional `api_key` supports navigator.sendBeacon.
 * Branches explicitly (rather than z.union) so validation errors point at the right fields.
 */
export function parseIngestBody(
  json: unknown,
): { success: true; events: IncomingEvent[] } | { success: false; error: z.ZodError } {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return {
      success: false,
      error: new z.ZodError([{ code: "custom", path: [], message: "Body must be a JSON object" }]),
    };
  }
  if ("batch" in json) {
    const parsed = batchBodySchema.safeParse(json);
    return parsed.success ? { success: true, events: parsed.data.batch } : { success: false, error: parsed.error };
  }
  const parsed = singleBodySchema.safeParse(json);
  if (!parsed.success) return { success: false, error: parsed.error };
  const { event, distinctId, timestamp, properties } = parsed.data;
  return { success: true, events: [{ event, distinctId, timestamp, properties }] };
}
