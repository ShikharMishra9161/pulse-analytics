import { Lock } from "lucide-react";
import { EmptyState } from "./empty-state";

export function AccessDenied({ what = "this page" }: { what?: string }) {
  return (
    <EmptyState
      icon={Lock}
      title="You don't have access"
      description={`Your role doesn't allow viewing ${what}. Ask an organization admin if you need access.`}
    />
  );
}
