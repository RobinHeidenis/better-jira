import { RiGitMergeLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { cn } from "cn";
import { useState } from "react";
import { type MergeRequest, mergeRequestsOptions } from "#/lib/api/gitlab";
import { store } from "#/lib/store";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Spinner } from "./ui/spinner";

const stateStyle: Record<MergeRequest["state"], string> = {
  opened: "border-emerald-500/40 text-emerald-500",
  merged: "border-violet-500/40 text-violet-400",
  closed: "border-destructive/40 text-destructive",
  locked: "text-muted-foreground",
};

const MergeRequestRow = ({ mergeRequest }: { mergeRequest: MergeRequest }) => (
  <li>
    <a
      href={mergeRequest.web_url}
      target="_blank"
      rel="noreferrer"
      className="block space-y-1 px-3 py-2 hover:bg-muted"
    >
      <span className="flex items-center gap-2">
        <Badge variant="outline" className={stateStyle[mergeRequest.state]}>
          {mergeRequest.state}
        </Badge>
        {mergeRequest.draft ? <Badge variant="outline">draft</Badge> : null}
        <span className="truncate text-muted-foreground">
          {mergeRequest.references.full}
        </span>
      </span>
      <span className="line-clamp-2 text-foreground">
        {mergeRequest.title.replace(/^Draft:\s*/i, "")}
      </span>
    </a>
  </li>
);

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
      <div className="flex justify-center p-4">
        <Spinner />
      </div>
    );
  }
  if (error) {
    return (
      <p className="p-3 text-destructive">
        Couldn't load merge requests: {error.message}
      </p>
    );
  }
  if (!data.length) {
    return (
      <p className="p-3 text-muted-foreground">
        No merge requests mention {issueKey}.
      </p>
    );
  }
  return (
    <ul className="max-h-80 divide-y overflow-y-auto">
      {data.map((mergeRequest) => (
        <MergeRequestRow key={mergeRequest.id} mergeRequest={mergeRequest} />
      ))}
    </ul>
  );
};

export const MergeRequestsPopover = ({ issueKey }: { issueKey: string }) => {
  const hasToken = useSelector(store, (state) => !!state.gitlabApiKey);
  const projectIds = useSelector(store, (state) => state.gitlabProjects);
  const [open, setOpen] = useState(false);

  if (!hasToken || !projectIds?.length) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Merge requests"
        className={cn(
          "cursor-pointer text-muted-foreground hover:text-foreground",
          open && "text-foreground",
        )}
      >
        <RiGitMergeLine className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 p-0">
        <p className="border-b px-3 py-2 font-semibold">
          Merge requests for {issueKey}
        </p>
        {/* Mounted only while open, so cards don't query GitLab up front. */}
        {open ? (
          <MergeRequestList issueKey={issueKey} projectIds={projectIds} />
        ) : null}
      </PopoverContent>
    </Popover>
  );
};
