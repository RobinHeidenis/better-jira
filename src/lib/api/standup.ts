import { queryOptions, skipToken } from "@tanstack/react-query";
import { store } from "../store";
import {
  type ReviewedMergeRequest,
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
const issueKeys = (mergeRequest: ReviewedMergeRequest) => {
  const text = `${mergeRequest.title} ${mergeRequest.source_branch}`;
  return [
    ...new Set(
      [...text.matchAll(/(?<![A-Za-z0-9])([A-Za-z][A-Za-z0-9_]*-\d+)/g)].map(
        (match) => match[1].toUpperCase(),
      ),
    ),
  ];
};

export type ReviewedTicket = {
  issue: MyIssue;
  approved: boolean;
  comments: number;
};

/**
 * The tickets behind the merge requests the user reviewed, with what they did
 * across them. Reviews of merge requests that name no ticket stay as such.
 */
export const reviewedTicketsOptions = (projectIds: number[], since: string) => {
  const { developerField } = store.get();
  return queryOptions({
    queryKey: ["standup", "reviewed-tickets", projectIds, since],
    queryFn: async ({ client }) => {
      const reviewed = await client.fetchQuery(
        reviewedMergeRequestsOptions(projectIds, since),
      );
      const byKey = new Map<string, ReviewedMergeRequest[]>();
      for (const mergeRequest of reviewed) {
        for (const key of issueKeys(mergeRequest)) {
          byKey.set(key, [...(byKey.get(key) ?? []), mergeRequest]);
        }
      }

      // A key Jira doesn't know fails a whole JQL query, so each is looked up
      // on its own and a miss (like a branch named "release-2") is dropped.
      const found = await Promise.all(
        [...byKey.keys()].map((key) =>
          searchWithRoles(client, `key = "${key}"`, developerField).catch(
            () => [],
          ),
        ),
      );
      const tickets: ReviewedTicket[] = found.flat().map((issue) => {
        const mergeRequests = byKey.get(issue.key) ?? [];
        return {
          issue,
          approved: mergeRequests.some((mergeRequest) => mergeRequest.approved),
          comments: mergeRequests.reduce(
            (total, mergeRequest) => total + mergeRequest.comments,
            0,
          ),
        };
      });
      const foundKeys = new Set(tickets.map((ticket) => ticket.issue.key));
      const unlinked = reviewed.filter(
        (mergeRequest) =>
          !issueKeys(mergeRequest).some((key) => foundKeys.has(key)),
      );
      return { tickets, unlinked };
    },
    refetchOnWindowFocus: refetchOnReturn,
  });
};
