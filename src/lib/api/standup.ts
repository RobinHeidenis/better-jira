import {
  type QueryClient,
  queryOptions,
  skipToken,
} from "@tanstack/react-query";
import { store } from "../store";
import {
  type MergeRequest,
  mergedMergeRequestsOptions,
  reviewedMergeRequestsOptions,
} from "./gitlab";
import { jqlField, type MyIssue, mineJql, searchWithRoles } from "./my-work";
import { refetchOnReturn } from "./refetch";

/** Midnight at the start of the previous weekday: Friday on a Monday. */
export const lastWorkingDay = (now = new Date()) => {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  do {
    day.setDate(day.getDate() - 1);
  } while (day.getDay() === 0 || day.getDay() === 6);
  return day;
};

/** JQL wants local time as "yyyy-MM-dd HH:mm". */
const jqlDate = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** Tickets the current user moved into one of the review statuses. */
export const movedToReviewOptions = (statusIds: string[], since: Date) => {
  const { developerField } = store.get();
  return queryOptions({
    queryKey: ["standup", "moved-to-review", 2, statusIds, since.toISOString()],
    queryFn: statusIds.length
      ? ({ client }) =>
          searchWithRoles(
            client,
            `status CHANGED TO (${statusIds.join(", ")}) BY currentUser() AFTER "${jqlDate(since)}" ORDER BY updated DESC`,
            developerField,
          )
      : skipToken,
    refetchOnWindowFocus: refetchOnReturn,
  });
};

/** The current user's To Do tickets that have a start date, soonest first. */
export const plannedTodosOptions = () => {
  const { developerField, startDateField } = store.get();
  return queryOptions({
    queryKey: ["standup", "planned-todos", 2, developerField, startDateField],
    queryFn: startDateField
      ? ({ client }) => {
          const start = jqlField(startDateField);
          return searchWithRoles(
            client,
            `(${mineJql(developerField)}) AND statusCategory = "To Do" AND ${start} is not EMPTY ORDER BY ${start} ASC`,
            developerField,
            [startDateField],
          );
        }
      : skipToken,
    refetchOnWindowFocus: refetchOnReturn,
  });
};

/** Issue keys an MR names in its title or branch, like HR-123 or hr-123-fix. */
const issueKeys = (mergeRequest: MergeRequest) => {
  const text = `${mergeRequest.title} ${mergeRequest.source_branch}`;
  return [
    ...new Set(
      [...text.matchAll(/(?<![A-Za-z0-9])([A-Za-z][A-Za-z0-9_]*-\d+)/g)].map(
        (match) => match[1].toUpperCase(),
      ),
    ),
  ];
};

export type TicketMergeRequests<T extends MergeRequest> = {
  issue: MyIssue;
  mergeRequests: T[];
};

/**
 * Groups merge requests under the Jira tickets they name. Ones that name no
 * ticket Jira knows come back as `unlinked`.
 */
const byTicket = async <T extends MergeRequest>(
  client: QueryClient,
  mergeRequests: T[],
) => {
  const { developerField } = store.get();
  const byKey = new Map<string, T[]>();
  for (const mergeRequest of mergeRequests) {
    for (const key of issueKeys(mergeRequest)) {
      byKey.set(key, [...(byKey.get(key) ?? []), mergeRequest]);
    }
  }

  // A key Jira doesn't know fails a whole JQL query, so each is looked up on
  // its own and a miss (like a branch named "release-2") is dropped.
  const found = await Promise.all(
    [...byKey.keys()].map((key) =>
      searchWithRoles(client, `key = "${key}"`, developerField).catch(() => []),
    ),
  );
  const tickets: TicketMergeRequests<T>[] = found
    .flat()
    .map((issue) => ({ issue, mergeRequests: byKey.get(issue.key) ?? [] }));
  const foundKeys = new Set(tickets.map((ticket) => ticket.issue.key));
  const unlinked = mergeRequests.filter(
    (mergeRequest) =>
      !issueKeys(mergeRequest).some((key) => foundKeys.has(key)),
  );
  return { tickets, unlinked };
};

/** The tickets behind the merge requests the user reviewed. */
export const reviewedTicketsOptions = (projectIds: number[], since: string) =>
  queryOptions({
    queryKey: ["standup", "reviewed-tickets", 2, projectIds, since],
    queryFn: async ({ client }) =>
      byTicket(
        client,
        await client.fetchQuery(
          reviewedMergeRequestsOptions(projectIds, since),
        ),
      ),
    refetchOnWindowFocus: refetchOnReturn,
  });

/** The tickets behind the user's merge requests merged since a moment. */
export const mergedTicketsOptions = (projectIds: number[], since: string) =>
  queryOptions({
    queryKey: ["standup", "merged-tickets", projectIds, since],
    queryFn: async ({ client }) =>
      byTicket(
        client,
        await client.fetchQuery(mergedMergeRequestsOptions(projectIds, since)),
      ),
    refetchOnWindowFocus: refetchOnReturn,
  });
