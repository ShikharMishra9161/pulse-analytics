import type { Metadata } from "next";
import { KeyRound, PartyPopper } from "lucide-react";
import { AccessDenied } from "@/components/access-denied";
import { CodeBlock } from "@/components/code-block";
import { CopyButton } from "@/components/copy-button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PaginationNav } from "@/components/pagination-nav";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateKeyDialog } from "@/features/api-keys/components/create-key-dialog";
import { RevokeKeyButton } from "@/features/api-keys/components/revoke-key-button";
import { listApiKeys } from "@/features/api-keys/service";
import { ingestSnippet } from "@/features/analytics/components/getting-started";
import { ingestEndpoint } from "@/features/analytics/page-params";
import { formatNumber, formatRelative } from "@/lib/format";
import { parsePageParams } from "@/lib/pagination";
import { can } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { requireProjectPage } from "@/server/access";

export const metadata: Metadata = { title: "API keys" };

export default async function ApiKeysPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; projectId: string }>;
  searchParams: Promise<{ page?: string; welcome?: string }>;
}) {
  const { orgSlug, projectId } = await params;
  const ctx = await requireProjectPage(orgSlug, projectId);
  if (!can(ctx.role, "apikey:read")) return <AccessDenied what="API keys" />;

  const sp = await searchParams;
  const keys = await listApiKeys(projectId, parsePageParams(sp));
  const canCreate = can(ctx.role, "apikey:create");
  const canRevoke = can(ctx.role, "apikey:revoke");
  const welcome = sp.welcome === "1" && keys.total === 0;
  const firstActive = keys.items.find((k) => !k.revokedAt);

  return (
    <div className="space-y-6">
      <PageHeader
        title="API keys"
        description="Authenticate event ingestion for this project."
        actions={canCreate ? <CreateKeyDialog projectId={projectId} defaultOpen={welcome} /> : null}
      />

      {welcome && (
        <Alert>
          <PartyPopper />
          <AlertTitle>{ctx.project.name} is ready</AlertTitle>
          <AlertDescription>Create your first API key to start sending events.</AlertDescription>
        </Alert>
      )}

      {keys.total === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No API keys yet"
          description="Create a key to start sending events. You'll get a public key for browsers and a secret key for servers."
          action={canCreate ? <CreateKeyDialog projectId={projectId} /> : null}
        />
      ) : (
        <>
          <Card className="py-0">
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Public key</TableHead>
                    <TableHead className="hidden md:table-cell">Secret</TableHead>
                    <TableHead className="hidden lg:table-cell">Last used</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">Requests</TableHead>
                    <TableHead className="pr-6 text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.items.map((k) => (
                    <TableRow key={k.id} className={cn(k.revokedAt && "text-muted-foreground")}>
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-2 font-medium">
                          {k.name}
                          {k.revokedAt ? <Badge variant="outline">Revoked</Badge> : <Badge variant="secondary">Active</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created {formatRelative(k.createdAt)}
                          {k.createdBy && ` by ${k.createdBy.name ?? k.createdBy.email}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <code className="max-w-44 truncate font-mono text-xs">{k.publicKey}</code>
                          {!k.revokedAt && <CopyButton value={k.publicKey} label="Copy public key" />}
                        </div>
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs md:table-cell">{k.secretPrefix}••••••••</TableCell>
                      <TableCell className="hidden text-sm lg:table-cell">{formatRelative(k.lastUsedAt)}</TableCell>
                      <TableCell className="tabular hidden text-right text-sm lg:table-cell">{formatNumber(k.requestCount)}</TableCell>
                      <TableCell className="pr-6 text-right">
                        {canRevoke && !k.revokedAt && <RevokeKeyButton projectId={projectId} apiKeyId={k.id} name={k.name} />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <PaginationNav {...keys} noun="keys" hrefFor={(page) => `?page=${page}`} />
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Send your first event</CardTitle>
          <CardDescription>
            <code className="font-mono text-xs">POST</code> single events or <code className="font-mono text-xs">{"{ batch: [...] }"}</code> of up
            to 100 to the ingestion endpoint.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-1 pl-3">
            <code className="min-w-0 flex-1 truncate font-mono text-xs">{ingestEndpoint()}</code>
            <CopyButton value={ingestEndpoint()} label="Copy endpoint" />
          </div>
          <CodeBlock title="cURL" code={ingestSnippet(ingestEndpoint(), firstActive?.publicKey)} />
        </CardContent>
      </Card>
    </div>
  );
}
