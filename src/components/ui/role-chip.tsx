import { Code2Icon, UserCheckIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export function RoleChip({
  name,
  initials,
  src,
  role,
}: {
  name: string;
  initials: string;
  src?: string;
  role: "developer" | "assignee";
}) {
  return (
    <Badge
      variant="outline"
      className="h-6 gap-1.5 rounded-none py-0 pl-1.5 pr-0.5 text-muted-foreground [&>svg]:size-3.5"
    >
      {role === "developer" ? (
        <Code2Icon aria-hidden="true" />
      ) : (
        <UserCheckIcon aria-hidden="true" />
      )}
      <Avatar className="size-[18px] shrink-0 rounded-none after:content-none">
        <AvatarImage src={src} alt="" className="rounded-none" />
        <AvatarFallback className="rounded-none text-[9px]">
          {initials}
        </AvatarFallback>
      </Avatar>
      <span className="sr-only">
        {role === "developer" ? "Developer" : "Assignee"}: {name}
      </span>
    </Badge>
  );
}
