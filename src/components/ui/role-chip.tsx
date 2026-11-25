import { RiCodeSSlashLine, RiUserFollowLine } from "@remixicon/react";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import { Badge } from "#/components/ui/badge";

export function RoleChip({
  name,
  initials,
  src,
  kind,
}: {
  name: string;
  initials: string;
  src?: string;
  kind: "developer" | "assignee";
}) {
  return (
    <Badge
      variant="outline"
      className="h-6 gap-1.5 rounded-none py-0 pl-1.5 pr-0.5 text-muted-foreground [&>svg]:size-3.5"
    >
      {kind === "developer" ? (
        <RiCodeSSlashLine aria-hidden="true" />
      ) : (
        <RiUserFollowLine aria-hidden="true" />
      )}
      <Avatar rounded={false} className="size-[18px]">
        <AvatarImage src={src} alt="" />
        <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
      </Avatar>
      <span className="sr-only">
        {kind === "developer" ? "Developer" : "Assignee"}: {name}
      </span>
    </Badge>
  );
}
