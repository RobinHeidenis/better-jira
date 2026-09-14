import type { QueryFunctionContext, QueryKey } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { request } from "./api";

export const jiraIssueSchema = z.object({
  id: z.string(),
  key: z.string(),
  fields: z.looseObject({
    summary: z.string(),
    // `statusCategory` is the coarse To Do / In Progress / Done grouping and
    // lives under `status`, alongside the project's own status name.
    status: z.object({
      id: z.string(),
      name: z.string(),
      statusCategory: z.object({
        name: z.string(),
      }),
    }),
    assignee: z
      .object({
        accountId: z.string(),
        displayName: z.string(),
        avatarUrls: z.object({
          "48x48": z.string().nullish(),
        }),
      })
      .nullable(),
    customfield_10031: z
      .object({
        accountId: z.string(),
        displayName: z.string(),
        avatarUrls: z.object({
          "48x48": z.string().nullish(),
        }),
      })
      .nullish(),
    // Both are optional per-project: a project can have its priority field
    // hidden, and unassigned issues send `assignee: null`.
    priority: z
      .object({
        name: z.string(),
      })
      .nullable(),
    labels: z.array(z.string()),
    issuetype: z.object({
      name: z.string(),
    }),
    parent: z
      .object({
        id: z.string(),
        key: z.string(),
        fields: z.object({
          summary: z.string(),
        }),
      })
      .optional(),
  }),
});

export type JiraIssue = z.infer<typeof jiraIssueSchema>;

/** Issues grouped by the id of the status they're in. */
export type IssuesByStatusId = Record<string, JiraIssue[]>;

const boardIssuesSchema = z.object({
  issues: z.array(jiraIssueSchema),
  // Absent on the last page — see the pagination loop below.
  nextPageToken: z.string().nullish(),
});

/** Only what a card renders; the default is every navigable field. */
const fields = [
  "summary",
  "status",
  "assignee",
  "priority",
  "labels",
  "issuetype",
  "customfield_10031",
  "parent",
] as const;

/**
 * Token pagination can't be parallelised — each page needs the previous page's
 * token — so every extra page is another serial round trip through the server
 * function to Jira. Far better to ask for a big page and usually get the whole
 * board in one. The endpoint's documented ceiling is 5000.
 */
const PAGE_SIZE = 1000;

/**
 * Issues for a board, keyed by status id.
 *
 * Status id rather than name, because that's what the board configuration maps
 * its columns by: several statuses can share one column, and a column's title
 * ("Code review") is unrelated to the status category ("In Progress").
 *
 * A plain object rather than a `Map` so it survives being JSON-serialised into
 * the persisted query cache, and so React Query's structural sharing can keep
 * references stable across refetches.
 */
export const getBoardIssues = async (
  boardId: number,
  jql: string,
  { client, queryKey }: QueryFunctionContext<QueryKey>,
) => {
  const issuesByStatusId: IssuesByStatusId = {};

  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      fields: fields.join(","),
      maxResults: String(PAGE_SIZE),
      jql,
    });
    if (pageToken) params.set("nextPageToken", pageToken);

    const page = await request(
      `board/${boardId}/issue?${params}`,
      boardIssuesSchema,
      "software",
    );

    for (const issue of page.issues) {
      const statusId = issue.fields.status.id;
      const group = issuesByStatusId[statusId];
      if (group) {
        group.push(issue);
      } else {
        issuesByStatusId[statusId] = [issue];
      }
    }

    pageToken = page.nextPageToken ?? undefined;

    // Publish each page as it lands so a multi-page board fills in as it
    // arrives rather than staying empty until the last one. A fresh top-level
    // reference is what wakes the observers up; the final `return` settles it.
    if (pageToken) {
      client.setQueryData<IssuesByStatusId>(queryKey, { ...issuesByStatusId });
    }
  } while (pageToken);

  return issuesByStatusId;
};

export const boardIssuesOptions = (boardId: number, jql: string) => {
  return queryOptions({
    queryKey: ["boards", boardId, "issues"],
    queryFn: (context) => getBoardIssues(boardId, jql, context),
  });
};
