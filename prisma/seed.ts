/**
 * Demo data: 4 users (one per role), one organization, two projects, API keys
 * and ~90 days of realistic events.
 *
 *   npm run db:seed
 *
 * Idempotent: removes the demo organization and users before recreating them.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";

const db = new PrismaClient();

const DEMO_PASSWORD = "demo1234";
const DAYS = 90;
const ORG_SLUG = "acme";

// Deterministic PRNG so every seed produces the same shape of data.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)]!;
function weighted<T>(entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [value, w] of entries) if ((r -= w) <= 0) return value;
  return entries[entries.length - 1]![0];
}

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const randomBase62 = (n: number) => Array.from(randomBytes(n), (b) => BASE62[b % 62]).join("");
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

const EVENTS = [
  ["page_view", 50],
  ["button_clicked", 15],
  ["feature_used", 12],
  ["login", 8],
  ["search", 6],
  ["signup", 3],
  ["invite_sent", 2],
  ["purchase", 2],
  ["subscription_upgraded", 1],
] as const;
const PATHS = ["/", "/pricing", "/docs", "/dashboard", "/settings", "/blog", "/changelog", "/integrations"];
const BROWSERS = [["Chrome", 62], ["Safari", 20], ["Firefox", 8], ["Edge", 8], ["Arc", 2]] as const;
const COUNTRIES = [["US", 38], ["DE", 12], ["GB", 10], ["IN", 10], ["FR", 7], ["BR", 6], ["CA", 6], ["JP", 5], ["NL", 6]] as const;
const DEVICES = [["desktop", 64], ["mobile", 31], ["tablet", 5]] as const;
const PLANS = [["free", 70], ["pro", 24], ["enterprise", 6]] as const;
const FEATURES = ["dashboards", "funnels", "exports", "alerts", "api", "sso"];

function propertiesFor(name: string): Prisma.InputJsonObject {
  const base = { browser: weighted(BROWSERS), country: weighted(COUNTRIES), device: weighted(DEVICES) };
  switch (name) {
    case "page_view":
      return { ...base, path: pick(PATHS), referrer: pick(["google", "direct", "twitter", "github", "newsletter"]) };
    case "button_clicked":
      return { ...base, button: pick(["get_started", "upgrade", "contact_sales", "export", "share"]), path: pick(PATHS) };
    case "feature_used":
      return { ...base, feature: pick(FEATURES), plan: weighted(PLANS) };
    case "purchase":
      return { ...base, plan: pick(["pro", "enterprise"]), amount: pick([29, 49, 99, 299]), currency: "USD" };
    case "subscription_upgraded":
      return { ...base, from: "free", to: pick(["pro", "enterprise"]) };
    case "search":
      return { ...base, query_length: 3 + Math.floor(rand() * 20), results: Math.floor(rand() * 50) };
    default:
      return base;
  }
}

async function seedEvents(projectId: string, scale: number) {
  const now = Date.now();
  const dayMs = 86_400_000;
  const users: { id: string; first: number }[] = [];
  const seen = new Map<string, { first: Date; last: Date }>();
  let buffer: Prisma.EventCreateManyInput[] = [];
  let total = 0;

  const flush = async () => {
    if (buffer.length === 0) return;
    await db.event.createMany({ data: buffer });
    total += buffer.length;
    buffer = [];
  };

  for (let day = DAYS; day >= 0; day--) {
    const dayStart = now - day * dayMs;
    const date = new Date(dayStart);
    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    const growth = 1 + (DAYS - day) / DAYS; // traffic doubles over the period
    // New users per day.
    const newUsers = Math.round((8 + rand() * 6) * growth * scale * (weekend ? 0.6 : 1));
    for (let i = 0; i < newUsers; i++) users.push({ id: `user_${projectId.slice(-4)}_${users.length + 1}`, first: dayStart });

    const dailyEvents = Math.round((380 + rand() * 120) * growth * scale * (weekend ? 0.55 : 1));
    for (let i = 0; i < dailyEvents; i++) {
      // Bias towards recently acquired users, with a long tail of returning ones.
      const idx = Math.floor(users.length * (1 - Math.pow(rand(), 2.2)));
      const user = users[Math.min(idx, users.length - 1)]!;
      // Diurnal curve peaking at ~15:00 UTC.
      const hour = Math.min(23, Math.max(0, Math.round(15 + (rand() + rand() + rand() - 1.5) * 8)));
      const ts = new Date(dayStart - (dayStart % dayMs) + hour * 3_600_000 + Math.floor(rand() * 3_600_000));
      if (ts.getTime() > now || ts.getTime() < user.first - dayMs) continue;
      const name = seen.has(user.id) ? weighted(EVENTS) : "signup";
      buffer.push({ projectId, name, distinctId: user.id, timestamp: ts, receivedAt: ts, properties: propertiesFor(name) });
      const s = seen.get(user.id);
      if (!s) seen.set(user.id, { first: ts, last: ts });
      else {
        if (ts < s.first) s.first = ts;
        if (ts > s.last) s.last = ts;
      }
      if (buffer.length >= 5000) await flush();
    }
  }
  await flush();

  const rows = [...seen.entries()].map(([distinctId, s]) => ({ projectId, distinctId, firstSeenAt: s.first, lastSeenAt: s.last }));
  for (let i = 0; i < rows.length; i += 5000) await db.projectUser.createMany({ data: rows.slice(i, i + 5000) });
  return { events: total, users: rows.length };
}

async function main() {
  console.log("🌱 Seeding demo data…");
  const emails = ["demo@pulse.dev", "admin@pulse.dev", "member@pulse.dev", "viewer@pulse.dev"];

  await db.organization.deleteMany({ where: { slug: ORG_SLUG } });
  await db.user.deleteMany({ where: { email: { in: emails } } });

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const [owner, admin, member, viewer] = await Promise.all(
    [
      ["Demo Owner", emails[0]],
      ["Alex Admin", emails[1]],
      ["Morgan Member", emails[2]],
      ["Val Viewer", emails[3]],
    ].map(([name, email]) =>
      db.user.create({ data: { name: name!, email: email!, passwordHash, emailVerified: new Date() } }),
    ),
  );

  const org = await db.organization.create({
    data: {
      name: "Acme Inc",
      slug: ORG_SLUG,
      members: {
        create: [
          { userId: owner!.id, role: "OWNER" },
          { userId: admin!.id, role: "ADMIN" },
          { userId: member!.id, role: "MEMBER" },
          { userId: viewer!.id, role: "VIEWER" },
        ],
      },
    },
  });

  await db.invitation.create({
    data: {
      organizationId: org.id,
      email: "new.hire@acme.test",
      role: "MEMBER",
      tokenHash: sha256(randomBytes(32).toString("base64url")),
      invitedById: owner!.id,
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
    },
  });

  const projects = [
    { name: "Acme Web App", description: "Marketing site and web dashboard", scale: 1 },
    { name: "Acme Mobile", description: "iOS and Android apps", scale: 0.35 },
  ];

  for (const p of projects) {
    const project = await db.project.create({
      data: { organizationId: org.id, name: p.name, description: p.description },
    });
    const secretKey = `sk_${randomBase62(40)}`;
    const key = await db.apiKey.create({
      data: {
        projectId: project.id,
        name: "Production",
        publicKey: `pk_${randomBase62(24)}`,
        secretHash: sha256(secretKey),
        secretPrefix: secretKey.slice(0, 7),
        createdById: owner!.id,
        lastUsedAt: new Date(Date.now() - 120_000),
        requestCount: BigInt(Math.round(48_000 * p.scale)),
      },
    });
    await db.apiKey.create({
      data: {
        projectId: project.id,
        name: "Old staging key",
        publicKey: `pk_${randomBase62(24)}`,
        secretHash: sha256(`sk_${randomBase62(40)}`),
        secretPrefix: "sk_old0",
        createdById: admin!.id,
        revokedAt: new Date(Date.now() - 20 * 86_400_000),
        requestCount: BigInt(1_204),
        lastUsedAt: new Date(Date.now() - 21 * 86_400_000),
      },
    });
    const stats = await seedEvents(project.id, p.scale);
    console.log(`  • ${p.name}: ${stats.events.toLocaleString()} events, ${stats.users.toLocaleString()} users`);
    console.log(`      public key: ${key.publicKey}`);
    console.log(`      secret key: ${secretKey}  (shown once)`);
  }

  console.log(`\n✅ Done. Sign in with ${emails.join(", ")} — password: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
