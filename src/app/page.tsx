import Link from "next/link";
import { ArrowRight, BarChart3, KeyRound, ShieldCheck, Users, Zap } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/session";

const FEATURES = [
  { icon: Zap, title: "One endpoint", body: "POST JSON events from any language, browser or server. Batches of up to 100." },
  { icon: BarChart3, title: "Instant dashboards", body: "Events over time, unique users, top events and property breakdowns." },
  { icon: Users, title: "Built for teams", body: "Organizations with Owner, Admin, Member and Viewer roles." },
  { icon: KeyRound, title: "Scoped API keys", body: "Per-project keys with usage tracking and one-click revocation." },
  { icon: ShieldCheck, title: "Secure by default", body: "Hashed secrets, rate limiting, strict CSP and RBAC on every action." },
];

const SNIPPET = `curl -X POST https://your-app.com/api/v1/events \\
  -H "Authorization: Bearer pk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "event": "signup",
    "distinctId": "user_123",
    "properties": { "plan": "pro" }
  }'`;

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-svh bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? (
            <Button asChild>
              <Link href="/dashboard">
                Dashboard <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]"
          />
          <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 text-center sm:pt-28">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground shadow-xs">
              <span className="size-1.5 rounded-full bg-chart-3" /> Lightweight product analytics
            </span>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              Understand what your users actually do.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-balance text-muted-foreground sm:text-lg">
              Pulse is a focused alternative to heavyweight analytics suites. Send events, get dashboards — no SDK
              lock-in, no sampling.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="h-10 px-5">
                <Link href={user ? "/dashboard" : "/register"}>
                  Start for free <ArrowRight />
                </Link>
              </Button>
              {!user && (
                <Button asChild size="lg" variant="outline" className="h-10 px-5">
                  <Link href="/login">View the demo</Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-6">
          <div className="overflow-hidden rounded-xl border bg-zinc-950 shadow-lg">
            <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
              <span className="size-2.5 rounded-full bg-white/20" />
              <span className="size-2.5 rounded-full bg-white/20" />
              <span className="size-2.5 rounded-full bg-white/20" />
              <span className="ml-3 font-mono text-xs text-white/50">track an event</span>
            </div>
            <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-zinc-200">
              <code>{SNIPPET}</code>
            </pre>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-px overflow-hidden px-6 py-24 sm:grid-cols-2 lg:grid-cols-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="p-5">
              <f.icon className="size-5 text-muted-foreground" />
              <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Pulse Analytics
      </footer>
    </div>
  );
}
