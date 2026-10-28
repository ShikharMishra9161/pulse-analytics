import Link from "next/link";
import { Logo } from "@/components/logo";

/** Minimal chrome for pages outside an organization (onboarding, account, invites). */
export function SimpleShell({ children, back }: { children: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="flex min-h-svh flex-col bg-muted/30">
      <header className="flex h-16 items-center justify-between border-b bg-background px-6">
        <Link href="/dashboard" aria-label="Pulse dashboard">
          <Logo />
        </Link>
        {back && (
          <Link href={back.href} className="text-sm text-muted-foreground hover:text-foreground">
            {back.label}
          </Link>
        )}
      </header>
      <main className="flex flex-1 justify-center px-4 py-12">{children}</main>
    </div>
  );
}
