import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import {
  BookmarkIcon,
  CornerLeftUpIcon,
  EqualIcon,
  HashIcon,
  LinkIcon,
} from "lucide-react";
import type z from "zod";
import { Badge } from "#/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Copyable } from "#/components/ui/copyable";
import { Link } from "#/components/ui/link";
import { RoleChip } from "#/components/ui/role-chip";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip";
import type { jiraIssueSchema } from "#/lib/api/issues";
import { jiraIssueUrl } from "#/lib/jira-url";
import { store } from "#/lib/store";

export const IssueCard = ({
  issue,
}: {
  issue: z.infer<typeof jiraIssueSchema>;
}) => {
  const baseUrl = useSelector(store, (state) => state.baseUrl);

  return (
    <Card>
      <CardHeader>
        {issue.fields.parent?.key ? (
          <CardDescription>
            <Link
              href={`/issue/${issue.fields.parent?.key}`}
              className="flex items-center gap-2"
            >
              <CornerLeftUpIcon size={13} />
              {issue.fields.parent.fields.summary}
            </Link>
          </CardDescription>
        ) : null}
        <CardTitle>{issue.fields.summary}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2 justify-between">
          <div className="flex flex-col items-start gap-3">
            <div className="group flex items-center gap-1">
              <Copyable
                value={issue.key}
                icon={HashIcon}
                tooltip="Copy ticket number"
              />
              {issue.key}
              {baseUrl && (
                <Copyable
                  value={jiraIssueUrl(baseUrl, issue.key)}
                  icon={LinkIcon}
                  tooltip="Copy link to ticket"
                  className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                />
              )}
            </div>
            <div className="flex items-start gap-2">
              <Tooltip>
                <TooltipTrigger>
                  <BookmarkIcon size={20} />
                </TooltipTrigger>
                <TooltipContent>Story</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <EqualIcon size={20} />
                </TooltipTrigger>
                <TooltipContent>Medium</TooltipContent>
              </Tooltip>
              <Badge className="!px-1 !py-0.5">1</Badge>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Tooltip>
              <TooltipTrigger>
                <RoleChip
                  name={
                    issue.fields.customfield_10031?.displayName ??
                    "Unknown User"
                  }
                  initials="RH"
                  role="developer"
                  src={
                    issue.fields.customfield_10031?.avatarUrls?.["48x48"] ?? ""
                  }
                />
              </TooltipTrigger>
              <TooltipContent>
                {issue.fields.customfield_10031?.displayName ?? "Unknown User"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <RoleChip
                  name={issue.fields.assignee?.displayName ?? "Unknown User"}
                  initials="JZ"
                  role="assignee"
                  src={issue.fields.assignee?.avatarUrls?.["48x48"] ?? ""}
                />
              </TooltipTrigger>
              <TooltipContent>
                {issue.fields.assignee?.displayName ?? "Unknown User"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
