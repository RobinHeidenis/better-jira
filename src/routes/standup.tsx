import { RiCloseLine } from "@remixicon/react";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { type ReactNode, useEffect } from "react";
import { ErrorState } from "#/components/error-state";
import { IssueRow } from "#/components/issue-row";
import { MergeRequestRow } from "#/components/merge-requests-popover";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "#/components/ui/card";
import { Link } from "#/components/ui/link";
import { Skeleton } from "#/components/ui/skeleton";
import { boardConfigurationOptions } from "#/lib/api/boards";
import type { MergeRequest, ReviewedMergeRequest } from "#/lib/api/gitlab";
import { type MyIssue, myIssuesOptions } from "#/lib/api/my-work";
import {
  lastWorkingDay,
  mergedTicketsOptions,
  movedToReviewOptions,
  plannedTodosOptions,
  reviewedTicketsOptions,
  type TicketMergeRequests,
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

const Section = ({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) => (
  <section className="space-y-2">
    <h2 className="flex items-baseline gap-2 text-sm font-semibold">
      {title}
      {count !== undefined ? (
        <span className="text-xs font-normal text-muted-foreground tabular-nums">
          {count}
        </span>
      ) : null}
    </h2>
    {children}
  </section>
);

/** Loading, error and empty states around a list. */
const QueryList = <T,>({
  title,
  query,
  empty,
  children,
}: {
  title: string;
  query: UseQueryResult<T[]>;
  empty: string;
  children: (items: T[]) => ReactNode;
}) => {
  const { data, isPending, error, refetch } = query;
  return (
    <Section title={title} count={data?.length}>
      {isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : error ? (
        <ErrorState
          title={`Couldn't load ${title.toLowerCase()}`}
          error={error}
          onRetry={() => void refetch()}
        />
      ) : data.length ? (
        <ul className="divide-y divide-border/60">{children(data)}</ul>
      ) : (
        <p className="text-muted-foreground">{empty}</p>
      )}
    </Section>
  );
};

const reviewNote = (mergeRequests: ReviewedMergeRequest[]) => {
  const comments = mergeRequests.reduce(
    (total, mergeRequest) => total + mergeRequest.comments,
    0,
  );
  return [
    mergeRequests.some((mergeRequest) => mergeRequest.approved)
      ? "Approved"
      : null,
    comments ? `${comments} ${comments === 1 ? "comment" : "comments"}` : null,
  ]
    .filter(Boolean)
    .join(", ");
};

const mergedNote = (mergeRequests: MergeRequest[]) =>
  mergeRequests.length === 1
    ? "1 merge request"
    : `${mergeRequests.length} merge requests`;

/** Tickets behind a set of merge requests, plus the ones that name none. */
const TicketSection = <T extends MergeRequest>({
  title,
  verb,
  query,
  note,
}: {
  title: string;
  /** Completes "Nothing …" and "Also …, without a ticket". */
  verb: string;
  query: UseQueryResult<{
    tickets: TicketMergeRequests<T>[];
    unlinked: T[];
  }>;
  note: (mergeRequests: T[]) => string;
}) => {
  const tickets = {
    ...query,
    data: query.data?.tickets,
  } as UseQueryResult<TicketMergeRequests<T>[]>;
  const unlinked = query.data?.unlinked ?? [];
  return (
    <>
      <QueryList title={title} query={tickets} empty={`Nothing ${verb}.`}>
        {(items) =>
          items.map((ticket) => (
            <IssueRow
              key={ticket.issue.id}
              issue={ticket.issue}
              date={note(ticket.mergeRequests)}
            />
          ))
        }
      </QueryList>
      {unlinked.length ? (
        <div className="-mt-6 space-y-1">
          <p className="text-muted-foreground">
            Also {verb}, without a ticket:
          </p>
          <ul className="divide-y divide-border/60">
            {unlinked.map((mergeRequest) => (
              <MergeRequestRow
                key={mergeRequest.id}
                mergeRequest={mergeRequest}
                note={note([mergeRequest])}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
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
              verb="reviewed"
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
              verb="merged"
              query={merged}
              note={mergedNote}
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
