import type { QueryFunctionContext, QueryKey } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { request } from "./api";

export const jiraBoardIssueSchema = z.object({
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
    fixVersions: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
        }),
      )
      .nullish(),
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
    customfield_10028: z.number().nullish(), // story points
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

export type JiraBoardIssue = z.infer<typeof jiraBoardIssueSchema>;

/** Issues grouped by the id of the status they're in. */
export type IssuesByStatusId = Record<string, JiraBoardIssue[]>;

const boardIssuesSchema = z.object({
  issues: z.array(jiraBoardIssueSchema),
  // Absent on the last page — see the pagination loop below.
  nextPageToken: z.string().nullish(),
});

const fields = [
  "summary",
  "status",
  "assignee",
  "priority",
  "labels",
  "issuetype",
  "customfield_10031",
  "customfield_10028",
  "parent",
  "fixVersions",
] as const;

const PAGE_SIZE = 1000;

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

export const boardIssuesOptions = (
  boardId: number,
  jql: string,
  cacheKey = "",
) => {
  return queryOptions({
    queryKey: ["boards", boardId, "issues", cacheKey],
    queryFn: (context) => getBoardIssues(boardId, jql, context),
  });
};

const jiraIssueSchema = jiraBoardIssueSchema.extend({
  fields: jiraBoardIssueSchema.shape.fields.extend({
    // Null when the issue has no description at all.
    description: z
      .object({
        type: z.string(),
        version: z.number(),
        content: z.any(),
      })
      .nullable(),
  }),
});

export const getIssue = async (issueId: string) => {
  return await request(`issue/${issueId}`, jiraIssueSchema, "atlassian");
};

export const issueOptions = (issueId: string) => {
  return queryOptions({
    queryKey: ["issue", issueId],
    queryFn: () => getIssue(issueId),
  });
};
