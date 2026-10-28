import { CopyButton } from "./copy-button";

export function CodeBlock({ code, title }: { code: string; title?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between border-b border-white/10 py-1 pr-1 pl-3">
        <span className="font-mono text-[11px] text-zinc-400">{title ?? "code"}</span>
        <CopyButton value={code} className="text-zinc-400 hover:bg-white/10 hover:text-zinc-100" />
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
