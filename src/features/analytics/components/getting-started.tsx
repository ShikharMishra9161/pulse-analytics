import Link from "next/link";
import { KeyRound, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CodeBlock } from "@/components/code-block";

export function ingestSnippet(endpoint: string, key = "pk_your_public_key") {
  return `curl -X POST ${endpoint} \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{"event":"signup","distinctId":"user_123","properties":{"plan":"pro"}}'`;
}

export function browserSnippet(endpoint: string, key = "pk_your_public_key") {
  return `await fetch("${endpoint}", {
  method: "POST",
  headers: { "Authorization": "Bearer ${key}", "Content-Type": "application/json" },
  body: JSON.stringify({ event: "page_view", distinctId: userId, properties: { path: location.pathname } }),
});`;
}

/** Shown on a project that has never received an event. */
export function GettingStarted({ endpoint, apiKeysHref, canManageKeys }: { endpoint: string; apiKeysHref: string; canManageKeys: boolean }) {
  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="grid gap-0 p-0 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col justify-center gap-4 border-b p-8 lg:border-r lg:border-b-0">
          <div className="relative w-fit">
            <span className="absolute inset-0 animate-ping rounded-full bg-chart-1/30" />
            <div className="relative flex size-11 items-center justify-center rounded-full border bg-background">
              <Radio className="size-5 text-chart-1" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Waiting for your first event</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Send an event to this project and your dashboard will light up instantly. Use a public key (
              <code className="font-mono text-xs">pk_…</code>) in browsers and a secret key on servers.
            </p>
          </div>
          {canManageKeys && (
            <Button asChild className="w-fit">
              <Link href={apiKeysHref}>
                <KeyRound /> Get an API key
              </Link>
            </Button>
          )}
        </div>
        <div className="space-y-4 bg-muted/30 p-6">
          <CodeBlock title="cURL" code={ingestSnippet(endpoint)} />
          <CodeBlock title="JavaScript" code={browserSnippet(endpoint)} />
        </div>
      </CardContent>
    </Card>
  );
}
