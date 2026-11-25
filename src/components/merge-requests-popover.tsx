import {
  RiGitClosePullRequestLine,
  RiGitMergeLine,
  RiGitPullRequestLine,
} from "@remixicon/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { cn } from "cn";
import { useState } from "react";
import {
  type MergeRequest,
  ticketMergeRequestsOptions,
} from "#/lib/api/gitlab";
import { store } from "#/lib/store";
import { initials, timeAgo } from "#/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Skeleton } from "./ui/skeleton";

const STATE = {
  opened: {
    label: "Open",
    icon: RiGitPullRequestLine,
    className: "text-emerald-500",
  },
  merged: {
    label: "Merged",
    icon: RiGitMergeLine,
    className: "text-violet-400",
  },
  closed: {
    label: "Closed",
    icon: RiGitClosePullRequestLine,
    className: "text-destructive",
  },
  locked: {
    label: "Locked",
    icon: RiGitClosePullRequestLine,
    className: "text-muted-foreground",
  },
} satisfies Record<MergeRequest["state"], unknown>;

/** `group/sub/hooray-frontend!3001` → `hooray-frontend`, `!3001`. */
const shortReference = (full: string) => {
  const [path = full, iid = ""] = full.split("!");
  return { project: path.split("/").at(-1) ?? path, iid: `!${iid}` };
};

const MergeRequestRow = ({ mergeRequest }: { mergeRequest: MergeRequest }) => {
  const state = STATE[mergeRequest.state];
  const isDraft = mergeRequest.draft && mergeRequest.state === "opened";
  const { project, iid } = shortReference(mergeRequest.references.full);
  const Icon = state.icon;

  return (
    <li>
      <a
        href={mergeRequest.web_url}
        target="_blank"
        rel="noreferrer"
        className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/60"
      >
        <Icon
          aria-label={isDraft ? "Draft" : state.label}
          className={cn(
            "mt-px size-4 shrink-0",
            isDraft ? "text-muted-foreground" : state.className,
          )}
        />
        <span className="min-w-0 flex-1 space-y-1">
          <span className="line-clamp-2 leading-snug text-foreground">
            {mergeRequest.title.replace(/^Draft:\s*/i, "")}
          </span>
          <span className="flex flex-wrap items-center gap-x-1.5 text-muted-foreground">
            <span>
              {project}
              <span className="text-muted-foreground/70">{iid}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>{isDraft ? "Draft" : state.label}</span>
            <span aria-hidden="true">·</span>
            <span>{timeAgo(mergeRequest.updated_at)}</span>
          </span>
        </span>
        {mergeRequest.author ? (
          <Avatar
            size="sm"
            rounded={false}
            className="shrink-0"
            title={mergeRequest.author.name}
          >
            <AvatarImage src={mergeRequest.author.avatar_url ?? undefined} />
            <AvatarFallback>
              {initials(mergeRequest.author.name)}
            </AvatarFallback>
          </Avatar>
        ) : null}
      </a>
    </li>
  );
};

export type PopoverIssue = {
  key: string;
  subtasks: { key: string; summary: string }[];
};

export const MergeRequestList = ({
  issue,
  projectIds,
}: {
  issue: PopoverIssue;
  projectIds: number[];
}) => {
  const { data, isPending, error } = useQuery(
    ticketMergeRequestsOptions(issue, projectIds),
  );

  if (isPending) {
    return (
      <div className="space-y-2 p-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <p className="px-3 py-3 text-destructive">
        Couldn't load merge requests: {error.message}
      </p>
    );
  }

  const groups = data.filter((group) => group.mergeRequests.length);
  if (!groups.length) {
    return (
      <p className="px-3 py-3 text-muted-foreground">
        No merge requests mention {issue.key}
        {issue.subtasks.length ? " or its subtasks" : ""}.
      </p>
    );
  }

  // Headings only earn their place once subtasks are in the mix.
  const showHeadings = groups.some((group) => group.key !== issue.key);

  return (
    <div className="max-h-96 overflow-y-auto bg-inherit">
      {groups.map((group) => (
        <section key={group.key} className="bg-inherit">
          {showHeadings ? (
            <h3 className="sticky top-0 flex gap-1.5 border-b bg-inherit px-3 py-1.5 text-muted-foreground">
              <span className="shrink-0 font-medium text-foreground">
                {group.key}
              </span>
              <span className="truncate">{group.summary ?? "This ticket"}</span>
            </h3>
          ) : null}
          <ul className="divide-y divide-border/60">
            {group.mergeRequests.map((mergeRequest) => (
              <MergeRequestRow
                key={mergeRequest.id}
                mergeRequest={mergeRequest}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

export const MergeRequestsPopover = ({ issue }: { issue: PopoverIssue }) => {
  const hasToken = useSelector(store, (state) => !!state.gitlabApiKey);
  const projectIds = useSelector(store, (state) => state.gitlabProjects);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  if (!hasToken || !projectIds?.length) return null;

  // Most of the wait is GitLab, so start as soon as the pointer or focus
  // lands on the icon rather than on click.
  const prefetch = () =>
    queryClient.prefetchQuery(ticketMergeRequestsOptions(issue, projectIds));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Merge requests"
        onPointerEnter={prefetch}
        onFocus={prefetch}
        className={cn(
          "cursor-pointer text-muted-foreground hover:text-foreground",
          open && "text-foreground",
        )}
      >
        <RiGitMergeLine className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[26rem] gap-0 p-0">
        <p className="border-b px-3 py-2 text-muted-foreground">
          Merge requests ·{" "}
          <span className="font-medium text-foreground">{issue.key}</span>
          {issue.subtasks.length
            ? ` and ${issue.subtasks.length} subtask${issue.subtasks.length === 1 ? "" : "s"}`
            : null}
        </p>
        {/* Mounted only while open, so cards don't query GitLab up front. */}
        {open ? (
          <MergeRequestList issue={issue} projectIds={projectIds} />
        ) : null}
      </PopoverContent>
    </Popover>
  );
};
