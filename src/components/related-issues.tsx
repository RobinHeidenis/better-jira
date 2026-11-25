import { RiArrowDownSLine, RiArrowRightSLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { cn } from "cn";
import { useState } from "react";
import { boardConfigurationOptions } from "#/lib/api/boards";
import type { JiraIssueLink, RelatedStatus } from "#/lib/api/issues";
import { store } from "#/lib/store";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { Link } from "./ui/link";
import { SharedTooltipTrigger } from "./ui/tooltip";

export type RelatedIssue = {
  key: string;
  summary: string;
  status?: RelatedStatus;
};

/** Links grouped by how they read from this issue, e.g. "is blocked by". */
export const groupLinks = (links: JiraIssueLink[]) => {
  const groups = new Map<string, RelatedIssue[]>();
  for (const link of links) {
    const other = link.outwardIssue ?? link.inwardIssue;
    if (!other) continue;
    const label = link.outwardIssue ? link.type.outward : link.type.inward;
    const group = groups.get(label) ?? [];
    group.push({
      key: other.key,
      summary: other.fields.summary,
      status: other.fields.status,
    });
    groups.set(label, group);
  }
  return [...groups];
};

const isDone = (status?: RelatedStatus) =>
  status?.statusCategory?.name === "Done";

/**
 * Colours by Jira's status category, except that the statuses of the code
 * review column picked in settings get their own colour.
 */
export const useStatusTone = () => {
  const boardId = useSelector(store, (state) => state.boardId);
  const reviewColumn = useSelector(store, (state) => state.reviewColumn);
  const { data: board } = useQuery({
    ...boardConfigurationOptions(boardId, true),
    enabled: reviewColumn !== null,
  });
  const reviewStatusIds = new Set(
    board?.columnConfig.columns
      .find((column) => column.name === reviewColumn)
      ?.statuses.map((status) => status.id),
  );

  return (status?: RelatedStatus) => {
    if (status?.id && reviewStatusIds.has(status.id)) return "bg-orange-500";
    if (isDone(status)) return "bg-emerald-500";
    if (status?.statusCategory?.name === "In Progress") return "bg-sky-500";
    return "bg-muted-foreground/50";
  };
};

export const RelatedGroup = ({
  label,
  issues,
  countDone = false,
}: {
  label: string;
  issues: RelatedIssue[];
  /** Summarise as "n of m done" rather than a plain count. */
  countDone?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const tone = useStatusTone();
  const done = issues.filter((issue) => isDone(issue.status)).length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-1.5 py-0.5 text-left hover:text-foreground">
        {open ? (
          <RiArrowDownSLine className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <RiArrowRightSLine className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="first-letter:uppercase">{label}</span>
        <span className="flex gap-0.5" aria-hidden="true">
          {issues.map((issue) => (
            <span
              key={issue.key}
              className={cn("size-1.5 rounded-full", tone(issue.status))}
            />
          ))}
        </span>
        <span className="ml-auto text-muted-foreground tabular-nums">
          {countDone ? `${done} of ${issues.length} done` : issues.length}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="space-y-0.5 py-1 pl-5">
          {issues.map((issue) => (
            <li key={issue.key} className="flex items-center gap-2">
              <SharedTooltipTrigger
                content={issue.status?.name ?? "Unknown status"}
                aria-label={issue.status?.name}
                render={<span />}
                className="flex shrink-0"
              >
                <span
                  className={cn("size-2 rounded-full", tone(issue.status))}
                />
              </SharedTooltipTrigger>
              <Link
                to="/issue/$issueId"
                params={{ issueId: issue.key }}
                underlined={false}
                className="min-w-0 flex-1 truncate"
              >
                <span className="font-medium">{issue.key}</span> {issue.summary}
              </Link>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
};
