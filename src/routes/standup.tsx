import { RiCloseLine } from "@remixicon/react";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { type ReactNode, useEffect } from "react";
import { IssueRow } from "#/components/issue-row";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "#/components/ui/card";
import { Link } from "#/components/ui/link";
import {
  projectNames,
  QueryList,
  TicketSection,
} from "#/components/work-lists";
import { boardConfigurationOptions } from "#/lib/api/boards";
import type { ReviewedMergeRequest } from "#/lib/api/gitlab";
import { type MyIssue, myIssuesOptions } from "#/lib/api/my-work";
import {
  lastWorkingDay,
  mergedTicketsOptions,
  movedToReviewOptions,
  plannedTodosOptions,
  reviewedTicketsOptions,
} from "#/lib/api/standup";
import { store } from "#/lib/store";
import { isPopupOpen } from "#/lib/utils";

export const Route = createFileRoute("/standup")({
  // Everything here reads the browser-only settings store.
  ssr: false,
  beforeLoad: () => {
    if (!store.state.apiToken) throw redirect({ to: "/setup/account" });
  },
  component: StandupPage,
});

const day = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const shortDate = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
});

const reviewNote = (mergeRequests: ReviewedMergeRequest[]) => {
  const comments = mergeRequests.reduce(
    (total, mergeRequest) => total + mergeRequest.comments,
    0,
  );
  return [
    ...(mergeRequests.some((mergeRequest) => mergeRequest.approved)
      ? ["Approved"]
      : []),
    ...(comments
      ? [`${comments} ${comments === 1 ? "comment" : "comments"}`]
      : []),
  ];
};

const issues = (items: MyIssue[], date?: (issue: MyIssue) => ReactNode) =>
  items.map((issue) => (
    <IssueRow key={issue.id} issue={issue} date={date?.(issue)} />
  ));

/** "2026-12-01" as a local date, not midnight UTC. */
const parseDay = (value: unknown) => {
  if (typeof value !== "string") return null;
  const [year, month, date] = value.split("-").map(Number);
  return year && month && date ? new Date(year, month - 1, date) : null;
};

function StandupPage() {
  const navigate = useNavigate();
  const since = lastWorkingDay();
  const boardId = useSelector(store, (state) => state.boardId);
  const reviewColumn = useSelector(store, (state) => state.reviewColumn);
  const startDateField = useSelector(store, (state) => state.startDateField);
  const projectIds = useSelector(store, (state) => state.gitlabProjects ?? []);
  const hasGitlab = useSelector(
    store,
    (state) => !!state.gitlabApiKey && !!state.gitlabProjects?.length,
  );

  const { data: board } = useQuery(boardConfigurationOptions(boardId, true));
  const columns = board?.columnConfig.columns ?? [];
  const reviewIndex = columns.findIndex(
    (column) => column.name === reviewColumn,
  );
  const reviewStatusIds =
    columns[reviewIndex]?.statuses.map((status) => status.id) ?? [];
  // Columns left of review hold the work still being done.
  const workingStatusIds = new Set(
    columns
      .slice(0, reviewIndex === -1 ? columns.length : reviewIndex)
      .flatMap((column) => column.statuses.map((status) => status.id)),
  );

  const reviewed = useQuery({
    ...reviewedTicketsOptions(projectIds, since.toISOString()),
    enabled: hasGitlab,
  });
  const merged = useQuery({
    ...mergedTicketsOptions(projectIds, since.toISOString()),
    enabled: hasGitlab,
  });
  const movedToReview = useQuery(movedToReviewOptions(reviewStatusIds, since));
  const mine = useQuery(myIssuesOptions());
  const workingOn = {
    ...mine,
    data: mine.data?.filter(
      (issue) =>
        issue.fields.status.statusCategory?.name === "In Progress" &&
        workingStatusIds.has(issue.fields.status.id),
    ),
  } as UseQueryResult<MyIssue[]>;
  const planned = useQuery(plannedTodosOptions());

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (isPopupOpen()) return;
      void navigate({ to: "/" });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  return (
    <div className="flex min-h-screen w-full justify-center p-8">
      <Card className="h-fit w-5xl">
        <CardContent className="space-y-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg">Standup</CardTitle>
              <CardDescription>Since {day.format(since)}</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Back to the board"
              title="Back to the board"
              nativeButton={false}
              render={<Link to="/" underlined={false} />}
            >
              <RiCloseLine />
            </Button>
          </div>

          {hasGitlab ? (
            <TicketSection
              title="Reviewed"
              empty="Nothing reviewed."
              unlinkedLabel="Also reviewed, without a ticket:"
              query={reviewed}
              note={reviewNote}
            />
          ) : null}

          {reviewColumn ? (
            <QueryList
              title="Put on review"
              query={movedToReview}
              empty={`Nothing moved to ${reviewColumn}.`}
            >
              {(items) => issues(items)}
            </QueryList>
          ) : null}

          {hasGitlab ? (
            <TicketSection
              title="Merged"
              empty="Nothing merged."
              unlinkedLabel="Also merged, without a ticket:"
              query={merged}
              note={projectNames}
            />
          ) : null}

          <QueryList
            title="Still working on"
            query={workingOn}
            empty="Nothing in progress."
          >
            {(items) => issues(items)}
          </QueryList>

          {startDateField ? (
            <QueryList
              title="Planned"
              query={planned}
              empty="No To Do tickets of yours have a start date."
            >
              {(items) =>
                issues(items, (issue) => {
                  const start = parseDay(issue.fields[startDateField]);
                  return start ? `Starts ${shortDate.format(start)}` : null;
                })
              }
            </QueryList>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
