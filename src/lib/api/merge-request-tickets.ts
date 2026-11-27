import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { store } from "../store";
import { type MergeRequest, reviewMergeRequestsOptions } from "./gitlab";
import { type MyIssue, searchWithRoles } from "./my-work";
import { refetchOnReturn } from "./refetch";

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
export const groupByTicket = async <T extends MergeRequest>(
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

/** Tickets with open merge requests that wait for the user's review. */
export const reviewTicketsOptions = (projectIds: number[]) =>
  queryOptions({
    queryKey: ["gitlab-review-tickets", projectIds],
    queryFn: async ({ client }) =>
      groupByTicket(
        client,
        await client.fetchQuery(reviewMergeRequestsOptions(projectIds)),
      ),
    refetchInterval: 2 * 60 * 1000,
    refetchOnWindowFocus: refetchOnReturn,
  });
