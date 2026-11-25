import { useSelector } from "@tanstack/react-store";
import { CornerLeftUpIcon, HashIcon, LinkIcon } from "lucide-react";
import { MergeRequestsPopover } from "#/components/merge-requests-popover";
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
import { SharedTooltipTrigger } from "#/components/ui/tooltip";
import {
  issueDeveloper,
  issueStoryPoints,
  type JiraBoardIssue,
} from "#/lib/api/issues";
import { jiraIssueUrl } from "#/lib/jira-url";
import { store } from "#/lib/store";
import { initials } from "#/lib/utils";

const FieldIcon = ({ name, iconUrl }: { name: string; iconUrl?: string }) => {
  if (!iconUrl) return null;
  return (
    <SharedTooltipTrigger content={name}>
      <img src={iconUrl} alt={name} className="size-4" />
    </SharedTooltipTrigger>
  );
};

export const IssueCard = ({
  issue,
  developerField,
  storyPointsField,
}: {
  issue: JiraBoardIssue;
  developerField: string | null;
  storyPointsField: string | null;
}) => {
  const baseUrl = useSelector(store, (state) => state.baseUrl);
  const developer = issueDeveloper(issue, developerField);
  const storyPoints = issueStoryPoints(issue, storyPointsField);
  const assigneeName = issue.fields.assignee?.displayName ?? "Unassigned";

  return (
    <Card>
      <CardHeader>
        {issue.fields.parent?.key ? (
          <CardDescription>
            <Link
              href={`/issue/${issue.fields.parent?.key}`}
              className="flex items-start gap-2"
            >
              <CornerLeftUpIcon size={13} className="mt-[0.2em] shrink-0" />
              <span
                className="line-clamp-2"
                title={issue.fields.parent.fields.summary}
              >
                {issue.fields.parent.fields.summary}
              </span>
            </Link>
          </CardDescription>
        ) : null}
        <CardTitle>
          <Link underlined={false} href={`/issue/${issue.key}`}>
            {issue.fields.summary}
          </Link>
        </CardTitle>
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
            <div className="flex items-center gap-2">
              <FieldIcon
                name={issue.fields.issuetype.name}
                iconUrl={issue.fields.issuetype.iconUrl}
              />
              {issue.fields.priority ? (
                <FieldIcon
                  name={issue.fields.priority.name}
                  iconUrl={issue.fields.priority.iconUrl}
                />
              ) : null}
              <MergeRequestsPopover
                issue={{
                  key: issue.key,
                  subtasks: (issue.fields.subtasks ?? []).map((subtask) => ({
                    key: subtask.key,
                    summary: subtask.fields.summary,
                  })),
                }}
              />
              {storyPoints !== null ? (
                <Badge className="!px-1 !py-0.5">{storyPoints}</Badge>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            {developer ? (
              <SharedTooltipTrigger content={developer.displayName}>
                <RoleChip
                  name={developer.displayName}
                  initials={initials(developer.displayName)}
                  kind="developer"
                  src={developer.avatarUrls["48x48"] ?? ""}
                />
              </SharedTooltipTrigger>
            ) : null}
            <SharedTooltipTrigger content={assigneeName}>
              <RoleChip
                name={assigneeName}
                initials={initials(assigneeName)}
                kind="assignee"
                src={issue.fields.assignee?.avatarUrls["48x48"] ?? ""}
              />
            </SharedTooltipTrigger>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
