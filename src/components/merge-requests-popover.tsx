import {
  RiGitClosePullRequestLine,
  RiGitMergeLine,
  RiGitPullRequestLine,
} from "@remixicon/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { cn } from "cn";
import { useState } from "react";
import { type MergeRequest, mergeRequestsOptions } from "#/lib/api/gitlab";
import { store } from "#/lib/store";
import { initials } from "#/lib/utils";
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

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
] as const;

const timeAgo = (iso: string) => {
  const seconds = (Date.parse(iso) - Date.now()) / 1000;
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return relativeTime.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
};

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

const MergeRequestList = ({
  issueKey,
  projectIds,
}: {
  issueKey: string;
  projectIds: number[];
}) => {
  const { data, isPending, error } = useQuery(
    mergeRequestsOptions(issueKey, projectIds),
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
  if (!data.length) {
    return (
      <p className="px-3 py-3 text-muted-foreground">
        No merge requests mention {issueKey}.
      </p>
    );
  }
  return (
    <ul className="max-h-80 divide-y divide-border/60 overflow-y-auto">
      {data.map((mergeRequest) => (
        <MergeRequestRow key={mergeRequest.id} mergeRequest={mergeRequest} />
      ))}
    </ul>
  );
};

export const MergeRequestsPopover = ({ issueKey }: { issueKey: string }) => {
  const hasToken = useSelector(store, (state) => !!state.gitlabApiKey);
  const projectIds = useSelector(store, (state) => state.gitlabProjects);
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  if (!hasToken || !projectIds?.length) return null;

  // Most of the wait is GitLab, so start as soon as the pointer or focus
  // lands on the icon rather than on click.
  const prefetch = () =>
    queryClient.prefetchQuery(mergeRequestsOptions(issueKey, projectIds));

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
          <span className="font-medium text-foreground">{issueKey}</span>
        </p>
        {/* Mounted only while open, so cards don't query GitLab up front. */}
        {open ? (
          <MergeRequestList issueKey={issueKey} projectIds={projectIds} />
        ) : null}
      </PopoverContent>
    </Popover>
  );
};
