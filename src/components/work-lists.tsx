import type { UseQueryResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { MergeRequest } from "#/lib/api/gitlab";
import type { TicketMergeRequests } from "#/lib/api/merge-request-tickets";
import { timeAgo } from "#/lib/utils";
import { ErrorState } from "./error-state";
import { IssueRow } from "./issue-row";
import { MergeRequestRow } from "./merge-requests-popover";
import { Skeleton } from "./ui/skeleton";

export const Section = ({
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
export const QueryList = <T,>({
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

/** Tickets behind a set of merge requests, plus the ones that name none. */
export const TicketSection = <T extends MergeRequest>({
  title,
  empty,
  unlinkedLabel,
  query,
  note,
}: {
  title: string;
  empty: string;
  /** Introduces the merge requests that name no ticket. */
  unlinkedLabel: string;
  query: UseQueryResult<{
    tickets: TicketMergeRequests<T>[];
    unlinked: T[];
  }>;
  /** Shown as chips on the ticket, and joined on a bare merge request. */
  note: (mergeRequests: T[]) => string[];
}) => {
  const tickets = {
    ...query,
    data: query.data?.tickets,
  } as UseQueryResult<TicketMergeRequests<T>[]>;
  const unlinked = query.data?.unlinked ?? [];
  return (
    <>
      <QueryList title={title} query={tickets} empty={empty}>
        {(items) =>
          items.map((ticket) => (
            <IssueRow
              key={ticket.issue.id}
              issue={ticket.issue}
              chips={note(ticket.mergeRequests)}
              date={timeAgo(
                ticket.mergeRequests
                  .map((mergeRequest) => mergeRequest.updated_at)
                  .sort()
                  .at(-1) ?? ticket.issue.fields.updated,
              )}
            />
          ))
        }
      </QueryList>
      {unlinked.length ? (
        <div className="-mt-6 space-y-1">
          <p className="text-muted-foreground">{unlinkedLabel}</p>
          <ul className="divide-y divide-border/60">
            {unlinked.map((mergeRequest) => (
              <MergeRequestRow
                key={mergeRequest.id}
                mergeRequest={mergeRequest}
                note={note([mergeRequest]).join(", ")}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
};

/** The projects of some merge requests, like "api" and "web". */
export const projectNames = (mergeRequests: MergeRequest[]) =>
  [
    ...new Set(
      mergeRequests.map(
        (mergeRequest) =>
          mergeRequest.references.full.split("!")[0]?.split("/").at(-1) ?? "",
      ),
    ),
  ].filter(Boolean);
