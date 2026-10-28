# Pulse — product analytics

A lightweight, multi-tenant product analytics platform (think a small PostHog / Mixpanel / Plausible).
Create organizations and projects, send events over a simple HTTP API, and explore them in real-time
and historical dashboards — with team roles, API key management and secure defaults.

**🔗 Live demo:** https://pulse-analytics-self.vercel.app — sign in with `demo@pulse.dev` / `demo1234`
(or `admin@`, `member@`, `viewer@pulse.dev` to see each role).

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Lucide · PostgreSQL · Prisma 6 ·
Auth.js v5 (Credentials + Google) · Recharts · Zod · Vitest · Upstash Redis (optional)

---

## Quick start

Requirements: **Node 20.11+**, **Docker** (for local Postgres).

```bash
npm install
cp .env.example .env              # then set AUTH_SECRET (npx auth secret)
npm run db:up                     # Postgres 16 on :5432 (also creates the pulse_test DB)
npm run db:migrate                # apply migrations
npm run db:seed                   # demo org, users, projects, ~70k events
npm run dev                       # http://localhost:3000
```

Sign in with any demo account — password **`demo1234`**:

| Email              | Role   |
| ------------------ | ------ |
| `demo@pulse.dev`   | Owner  |
| `admin@pulse.dev`  | Admin  |
| `member@pulse.dev` | Member |
| `viewer@pulse.dev` | Viewer |

The seed prints a public and secret API key for each project (secrets are shown only once).

### Scripts

| Script                    | What it does                                            |
| ------------------------- | ------------------------------------------------------- |
| `npm run dev` / `build` / `start` | Next.js dev server / production build / server |
| `npm test`                | Unit + integration tests (uses `TEST_DATABASE_URL`)     |
| `npm run typecheck` / `lint` | `tsc --noEmit` / ESLint                              |
| `npm run db:migrate`      | Create/apply migrations in development                  |
| `npm run db:deploy`       | Apply migrations in CI/production                       |
| `npm run db:seed` / `db:reset` | Seed demo data / drop, re-migrate and re-seed      |
| `npm run db:studio`       | Prisma Studio                                           |

### Environment variables

See [`.env.example`](.env.example). Summary:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Pooled connection string on Neon/Supabase |
| `DIRECT_URL` | ✅ | Direct (non-pooled) URL, used by migrations |
| `AUTH_SECRET` | ✅ | ≥ 32 chars. `npx auth secret` |
| `NEXT_PUBLIC_APP_URL` | ✅ | Used in emails, snippets and redirect validation |
| `AUTH_TRUST_HOST` | self-hosting | Vercel sets this automatically |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | optional | Google button is hidden when unset |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | **prod** | Shared rate limiting across serverless instances |
| `INGEST_RATE_LIMIT_PER_MINUTE` | optional | Per API key, default 600 |
| `TEST_DATABASE_URL` | tests | Wiped by the test suite — must differ from `DATABASE_URL` |

**Google OAuth:** create an OAuth client in Google Cloud Console with the redirect URI
`{APP_URL}/api/auth/callback/google`.

**Email** is mocked: verification and invitation links are printed to the server console. In development
the UI also shows the link so the flow is usable without an inbox. Replace the body of `sendMail` in
[`src/lib/mail.ts`](src/lib/mail.ts) with Resend/Postmark/SES for production — callers don't change.

---

## Sending events

`POST /api/v1/events` — authenticate with a project API key.

```bash
curl -X POST https://your-app.com/api/v1/events \
  -H "Authorization: Bearer pk_..." \
  -H "Content-Type: application/json" \
  -d '{ "event": "signup", "distinctId": "user_123", "properties": { "plan": "pro" } }'
```

| Field | Type | Rules |
| --- | --- | --- |
| `event` | string | required, 1–200 chars |
| `distinctId` | string | required, 1–200 chars — your stable user id |
| `timestamp` | ISO-8601 string or epoch ms | optional (defaults to receive time); ≤ 1h in the future, ≤ 1 year old |
| `properties` | object | optional; ≤ 16 KB, ≤ 100 top-level keys, ≤ 5 levels deep |

- **Batching:** send `{ "batch": [event, …] }` with up to 100 events. Batches are all-or-nothing.
- **Keys:** `Authorization: Bearer <key>`, `X-Api-Key: <key>`, or `"api_key"` in the body (for `navigator.sendBeacon`).
  Use the **public key** (`pk_…`) in browsers/mobile apps and the **secret key** (`sk_…`) on servers. Both can ingest.
- **CORS** is open (`*`): the endpoint never uses cookies, so cross-origin requests can't ride on a user's session.
- **Limits:** body ≤ 512 KB; per-key rate limit with `X-RateLimit-*` and `Retry-After` headers.

Every API response uses one envelope:

```jsonc
{ "ok": true,  "data": { "accepted": 2 } }                                     // 202
{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "…",
                          "fieldErrors": { "batch.0.event": ["event is required"] } } } // 422
```

Error codes: `BAD_REQUEST` 400 · `UNAUTHORIZED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 · `CONFLICT` 409 ·
`PAYLOAD_TOO_LARGE` 413 · `VALIDATION_ERROR` 422 · `RATE_LIMITED` 429 · `INTERNAL_ERROR` 500.

---

## Architecture

```
prisma/                  schema, migrations, seed
src/
  app/                   routes only — thin pages, layouts, route handlers
    (auth)/              login, register, verify-email
    o/[orgSlug]/         org shell (sidebar) → projects, members, settings
      projects/[projectId]/  overview, events, live, api-keys, settings
    api/v1/events/       public ingestion endpoint
    api/projects/[id]/live/  session-authenticated live snapshot (polled)
  features/<domain>/     feature modules
    schemas.ts           Zod schemas (shared by client forms and server)
    service.ts           business logic + data access (no Next.js APIs → unit-testable)
    actions.ts           server actions: validate → authorize → call service → revalidate
    components/          UI for that domain
  server/                session + access guards (requireOrgPage, authorizeProject, …)
  lib/                   cross-cutting: db, errors, result envelope, rate limit, RBAC, crypto
  components/            shared UI (ui/ = shadcn primitives, app-shell/ = sidebar & nav)
tests/                   unit/ (pure logic) and integration/ (real Postgres)
```

**Request flow for a mutation:** client form (react-hook-form + the same Zod schema) → server action created with
`createAction(schema, handler)` → server-side Zod validation → `authorizeOrg`/`authorizeProject` (session +
membership + permission) → service → `{ ok, data } | { ok, error }` → toast / field errors in the form.

**Reads** are React Server Components calling services directly. Dashboard filters live in the URL
(`?range=7d&event=signup&prop=plan&val=pro`) so every view is shareable and server-rendered; while a new slice
loads, the previous frame stays on screen (dimmed) instead of flashing skeletons. Skeletons are used for first
loads via `loading.tsx` and Suspense.

### Data model

| Table | Purpose |
| --- | --- |
| `users`, `accounts`, `sessions`, `verification_tokens` | Auth.js adapter tables (+ `passwordHash`) |
| `organizations`, `organization_members` | Tenancy; `role ∈ OWNER, ADMIN, MEMBER, VIEWER` |
| `invitations` | Email-bound, hashed, expiring, single-use invite tokens |
| `projects` | Belong to an organization |
| `api_keys` | Public key + **SHA-256 hash** of the secret, usage counters, soft revocation |
| `events` | Append-only event log (high write volume) |
| `project_users` | One row per (project, distinctId) with first/last seen — keeps user metrics cheap |

**Events table design**

- Composite primary key `(id, timestamp)`: Postgres requires the partition key in every unique constraint,
  so the table can be converted to `PARTITION BY RANGE (timestamp)` later without a key change.
- Indexes: `(projectId, timestamp DESC)` for time-range scans, `(projectId, name, timestamp)` for event filters
  and top-events, `(projectId, distinctId, timestamp)` for per-user queries, and a GIN `jsonb_path_ops` index on
  `properties` for `@>` containment filters. No other unique constraints, to keep inserts cheap.
- Ingestion writes a batch in **one transaction**: one multi-row `INSERT` into `events` plus one
  `INSERT … SELECT unnest(…) ON CONFLICT DO UPDATE` into `project_users` (deduplicated and sorted to avoid
  deadlocks between concurrent batches).

**Aggregations** are always done in SQL (`COUNT`, `COUNT(DISTINCT)`, `GROUP BY`, `date_trunc`, and
`generate_series` to fill empty buckets) and always bounded by `projectId` + time range, so they hit the
composite indexes. All values are bound parameters via `Prisma.sql` — nothing is string-interpolated. Lists are
paginated: offset pagination for small admin lists (projects, members, keys) and keyset pagination on
`(timestamp, id)` for the event stream.

---

## Security

| Concern | Implementation |
| --- | --- |
| Passwords | bcrypt (cost 12); constant-time comparison against a dummy hash for unknown users |
| Account enumeration | Registration always answers "check your inbox"; login returns one generic error |
| Email verification | Required for password sign-in; 24h hashed single-use tokens; confirmed via POST so link scanners can't consume them |
| Sessions | Auth.js JWT in `httpOnly`, `SameSite=Lax`, `Secure` (HTTPS) cookies; 7-day lifetime. The user is re-loaded from the DB on every request, so deleted users lose access immediately and roles are always current |
| Route protection | Middleware gates `/o`, `/dashboard`, `/onboarding`, `/account`; every page re-checks membership server-side (non-members get 404, so tenants can't be probed) |
| RBAC | One permission matrix ([`src/lib/permissions.ts`](src/lib/permissions.ts)) used by the server for enforcement and by the UI for hiding controls. Role hierarchy: admins can't manage owners or admins, or grant those roles; an org can never lose its last owner |
| Invitations | Hashed tokens, 7-day expiry, single use, **bound to the invited email** |
| API keys | Secrets shown once, stored as SHA-256; revocation propagates within 15s (in-process key cache) |
| Rate limiting | Per API key on ingestion; per IP/email on sign-in, registration, verification; per org on invites |
| Input validation | Zod on every server action, route handler and URL parameter; payload size/depth caps |
| SQL injection | Prisma queries and parameterized `Prisma.sql` only |
| XSS | React escaping, no `dangerouslySetInnerHTML`; strict nonce-based CSP (`script-src 'nonce-…' 'strict-dynamic'`) |
| CSRF | Server actions are POST-only with Next.js Origin checks; Auth.js uses CSRF tokens; the ingestion API is cookie-less |
| Open redirects | `callbackUrl` limited to same-origin relative paths |
| Headers | CSP, HSTS, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` |

---

## RBAC

| Capability | Owner | Admin | Member | Viewer |
| --- | :-: | :-: | :-: | :-: |
| View dashboards, events, live | ✅ | ✅ | ✅ | ✅ |
| View members | ✅ | ✅ | ✅ | ✅ |
| Create / edit projects | ✅ | ✅ | ✅ | |
| View / create API keys | ✅ | ✅ | ✅ | |
| Revoke API keys, delete projects | ✅ | ✅ | | |
| Invite & manage members, org settings | ✅ | ✅ ¹ | | |
| Delete organization | ✅ | | | |

¹ Admins can only manage Members and Viewers, and can only grant those roles.

---

## Testing

```bash
npm test
```

64 tests across:

- **Unit:** permission matrix and role hierarchy, event payload validation (bounds, NUL bytes, depth,
  batch size), API key generation/parsing, open-redirect guard, time-range parsing, rate limiter.
- **Integration (real Postgres, `TEST_DATABASE_URL`):**
  - *Auth:* password hashing, hashed one-time verification tokens (valid / wrong / expired / reused),
    unverified login blocked, no user enumeration, OAuth-only accounts can't use passwords.
  - *Ingestion:* calls the real route handler — public/secret/body keys, 401 for missing/invalid/revoked keys,
    422 with field errors, 400/413, per-key rate limiting (429 + `Retry-After`), tenant isolation,
    first/last-seen maintenance, usage tracking, CORS preflight.
  - *Organizations:* last-owner protection, admin hierarchy, cross-org isolation, email-bound single-use invitations.

---

## Deploying (Vercel + Neon/Supabase)

1. Create a Postgres database. Set `DATABASE_URL` to the **pooled** URL (Neon: `-pooler` host; Supabase:
   port 6543 with `?pgbouncer=true`) and `DIRECT_URL` to the direct URL.
2. Create an Upstash Redis database and set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
   (without it, each serverless instance rate-limits independently).
3. Set `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL` and optionally the Google OAuth variables in Vercel.
4. Run migrations on deploy — e.g. build command `npm run db:deploy && npm run build`, or a CI step.
5. Replace the mock mailer in `src/lib/mail.ts` with a real provider.

---

## Scaling notes & roadmap

What's here is deliberately simple; these are the next steps as volume grows:

- **Partition `events`** by month (`PARTITION BY RANGE (timestamp)`, e.g. with `pg_partman`). The schema
  is already partition-ready. Retention then becomes `DROP PARTITION`, and project deletion can move to a
  background job instead of a cascading delete.
- **Rollups:** pre-aggregate hourly/daily counts per (project, event) into a summary table or materialized view
  for long ranges; use HyperLogLog (`postgresql-hll`) for distinct users over large windows.
- **Ingestion buffer:** put a queue (Upstash QStash / Kafka) in front of inserts and write with `COPY`;
  batch API-key usage counters in Redis instead of one `UPDATE` per request.
- **Columnar store:** past ~1B events, move the events table to ClickHouse/Tinybird and keep Postgres for OLTP.
- **Product:** funnels, retention cohorts, saved dashboards, a JS SDK, a key/value property catalog,
  per-key scopes (read API via secret keys), audit log, password reset, 2FA, billing.

Known simplifications: charts bucket in **UTC**; the property-key list is sampled from recent events;
`requestCount` is updated after the response, so it's eventually consistent.
