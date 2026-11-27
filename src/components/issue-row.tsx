import type { ReactNode } from "react";
import type { MyIssue } from "#/lib/api/my-work";
import { timeAgo } from "#/lib/utils";
import { Link } from "./ui/link";

/** A ticket in a list, with the user's roles on it and a date at the end. */
export const IssueRow = ({
  issue,
  date,
}: {
  issue: MyIssue;
  /** Replaces the last-updated time. */
  date?: ReactNode;
}) => {
  const { fields } = issue;
  return (
    <li>
      <Link
        to="/issue/$issueId"
        params={{ issueId: issue.key }}
        underlined={false}
        className="flex items-center gap-2.5 px-2 py-2 hover:bg-muted/60"
      >
        {fields.issuetype?.iconUrl ? (
          <img
            src={fields.issuetype.iconUrl}
            alt={fields.issuetype.name}
            className="size-4 shrink-0"
          />
        ) : null}
        <span className="w-20 shrink-0 text-muted-foreground tabular-nums">
          {issue.key}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate">{fields.summary}</span>
          {fields.parent ? (
            <span className="block truncate text-muted-foreground">
              {fields.parent.fields.summary}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 gap-1">
          {issue.roles.map((role) => (
            <span
              key={role}
              className="bg-muted px-1 text-muted-foreground first-letter:uppercase"
            >
              {role}
            </span>
          ))}
        </span>
        <span className="w-20 shrink-0 text-right text-muted-foreground">
          {date ?? timeAgo(fields.updated)}
        </span>
      </Link>
    </li>
  );
};
