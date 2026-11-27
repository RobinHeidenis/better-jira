import { RiCloseLine } from "@remixicon/react";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { cn } from "cn";
import { type ReactNode, useEffect } from "react";
import { ErrorState } from "#/components/error-state";
import { IssueRow } from "#/components/issue-row";
import { MergeRequestRow } from "#/components/merge-requests-popover";
import { useStatusTone } from "#/components/related-issues";
import { useLaneOrder } from "#/components/transition-menu";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardTitle } from "#/components/ui/card";
import { Link } from "#/components/ui/link";
import { Skeleton } from "#/components/ui/skeleton";
import {
  authoredMergeRequestsOptions,
  type MergeRequest,
  reviewMergeRequestsOptions,
} from "#/lib/api/gitlab";
import { type MyIssue, myIssuesOptions } from "#/lib/api/my-work";
import { store } from "#/lib/store";
import { isPopupOpen } from "#/lib/utils";

export const Route = createFileRoute("/my-work")({
  // Everything here reads the browser-only settings store.
  ssr: false,
  beforeLoad: () => {
    if (!store.state.apiToken) throw redirect({ to: "/setup/account" });
  },
  component: MyWorkPage,
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

const Loading = () => (
  <div className="space-y-2">
    <Skeleton className="h-9 w-full" />
    <Skeleton className="h-9 w-full" />
    <Skeleton className="h-9 w-full" />
  </div>
);

const Tickets = () => {
  const { data, isPending, error, refetch } = useQuery(myIssuesOptions());
  const laneOrder = useLaneOrder();
  const tone = useStatusTone();

  if (isPending) return <Loading />;
  if (error) {
    return (
      <ErrorState
        title="Couldn't load your tickets"
        error={error}
        onRetry={() => void refetch()}
      />
    );
  }
  if (!data.length) {
    return (
      <p className="text-muted-foreground">
        Nothing open where you're the assignee or developer.
      </p>
    );
  }

  const groups = new Map<string, MyIssue[]>();
  for (const issue of data) {
    const group = groups.get(issue.fields.status.id) ?? [];
    group.push(issue);
    groups.set(issue.fields.status.id, group);
  }
  // Work under way comes before the backlog, each in board order.
  const backlog = (issues: MyIssue[]) =>
    issues[0].fields.status.statusCategory?.name === "To Do" ? 1 : 0;
  const ordered = [...groups.values()].sort(
    (a, b) =>
      backlog(a) - backlog(b) ||
      laneOrder(a[0].fields.status) - laneOrder(b[0].fields.status),
  );

  return (
    <div className="space-y-4">
      {ordered.map((issues) => {
        const status = issues[0].fields.status;
        return (
          <div key={status.id}>
            <h3 className="flex items-center gap-1.5 px-2 pb-1 text-muted-foreground">
              <span className={cn("size-2 rounded-full", tone(status))} />
              {status.name}
              <span className="tabular-nums">{issues.length}</span>
            </h3>
            <ul className="divide-y divide-border/60">
              {issues.map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
};

const MergeRequestSection = ({
  title,
  query,
  empty,
}: {
  title: string;
  query: UseQueryResult<MergeRequest[]>;
  empty: string;
}) => {
  const { data, isPending, error, refetch } = query;
  return (
    <Section title={title} count={data?.length}>
      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorState
          title={`Couldn't load ${title.toLowerCase()}`}
          error={error}
          onRetry={() => void refetch()}
        />
      ) : data.length ? (
        <ul className="divide-y divide-border/60">
          {data.map((mergeRequest) => (
            <MergeRequestRow
              key={mergeRequest.id}
              mergeRequest={mergeRequest}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">{empty}</p>
      )}
    </Section>
  );
};

const GitLab = ({ projectIds }: { projectIds: number[] }) => {
  const toReview = useQuery(reviewMergeRequestsOptions(projectIds));
  const authored = useQuery(authoredMergeRequestsOptions(projectIds));
  return (
    <>
      <MergeRequestSection
        title="Waiting for your review"
        query={toReview}
        empty="No open merge requests have you as a reviewer."
      />
      <MergeRequestSection
        title="Your merge requests"
        query={authored}
        empty="You have none open."
      />
    </>
  );
};

function MyWorkPage() {
  const hasGitlab = useSelector(
    store,
    (state) => !!state.gitlabApiKey && !!state.gitlabProjects?.length,
  );
  const projectIds = useSelector(store, (state) => state.gitlabProjects ?? []);
  const { data: tickets } = useQuery(myIssuesOptions());
  const navigate = useNavigate();

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
            <CardTitle className="text-lg">My work</CardTitle>
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
          {hasGitlab ? <GitLab projectIds={projectIds} /> : null}
          <Section title="Your tickets" count={tickets?.length}>
            <Tickets />
          </Section>
        </CardContent>
      </Card>
    </div>
  );
}
