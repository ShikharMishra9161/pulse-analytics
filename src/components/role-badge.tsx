import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, type Role } from "@/lib/permissions";

const VARIANT: Record<Role, "default" | "secondary" | "outline"> = {
  OWNER: "default",
  ADMIN: "secondary",
  MEMBER: "outline",
  VIEWER: "outline",
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge variant={VARIANT[role]}>{ROLE_LABELS[role]}</Badge>;
}
