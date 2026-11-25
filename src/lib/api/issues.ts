import type { QueryFunctionContext, QueryKey } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { request } from "./api";
import { attachmentSchema } from "./attachments";

const jiraUserSchema = z.object({
  accountId: z.string(),
  displayName: z.string(),
  avatarUrls: z.object({
    "48x48": z.string().nullish(),
  }),
});

/** The status of a subtask or linked issue, as Jira nests it. */
const relatedStatusSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  statusCategory: z.object({ name: z.string() }).optional(),
});

export type RelatedStatus = z.infer<typeof relatedStatusSchema>;

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
    assignee: jiraUserSchema.nullable(),
    reporter: jiraUserSchema.nullish(),
    // Both are optional per-project: a project can have its priority field
    // hidden, and unassigned issues send `assignee: null`.
    priority: z
      .object({
        name: z.string(),
        iconUrl: z.string().optional(),
      })
      .nullable(),
    labels: z.array(z.string()),
    issuetype: z.object({
      name: z.string(),
      iconUrl: z.string().optional(),
    }),
    // Only key and summary are used; Jira sends a few more fields per subtask.
    subtasks: z
      .array(
        z.object({
          key: z.string(),
          fields: z.object({
            summary: z.string(),
            status: relatedStatusSchema.optional(),
          }),
        }),
      )
      .optional(),
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

/** The site-specific custom fields the user picked during board setup. */
export type CustomFieldIds = {
  developerField: string | null;
  storyPointsField: string | null;
};

// Custom fields are keyed by a per-site id, so they can't be part of the
// static schema and are parsed out of the loose `fields` object instead.
const readCustomField = <TSchema extends z.ZodType>(
  issue: JiraBoardIssue,
  fieldId: string | null,
  schema: TSchema,
): z.infer<TSchema> | null => {
  if (!fieldId) return null;
  const result = schema.safeParse(issue.fields[fieldId]);
  return result.success ? result.data : null;
};

export const issueDeveloper = (issue: JiraBoardIssue, fieldId: string | null) =>
  readCustomField(issue, fieldId, jiraUserSchema);

export const issueStoryPoints = (
  issue: JiraBoardIssue,
  fieldId: string | null,
) => readCustomField(issue, fieldId, z.number());

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
  "reporter",
  "priority",
  "labels",
  "issuetype",
  "parent",
  "subtasks",
  "fixVersions",
];

const PAGE_SIZE = 1000;

export const getBoardIssues = async (
  boardId: number,
  jql: string,
  customFields: CustomFieldIds,
  { client, queryKey }: QueryFunctionContext<QueryKey>,
) => {
  const issuesByStatusId: IssuesByStatusId = {};
  const requestedFields = [
    ...fields,
    customFields.developerField,
    customFields.storyPointsField,
  ].filter((field) => field !== null);

  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      fields: requestedFields.join(","),
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
  customFields: CustomFieldIds,
) => {
  return queryOptions({
    queryKey: ["boards", boardId, "issues", customFields],
    queryFn: (context) => getBoardIssues(boardId, jql, customFields, context),
  });
};

const linkedIssueSchema = z.object({
  key: z.string(),
  fields: z.object({
    summary: z.string(),
    status: relatedStatusSchema.optional(),
  }),
});

// Each link names the other issue on one side only; which side says whether
// the relation reads as `inward` ("is blocked by") or `outward` ("blocks").
const issueLinkSchema = z.object({
  id: z.string(),
  type: z.object({ inward: z.string(), outward: z.string() }),
  inwardIssue: linkedIssueSchema.optional(),
  outwardIssue: linkedIssueSchema.optional(),
});

export type JiraIssueLink = z.infer<typeof issueLinkSchema>;

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
    created: z.string().optional(),
    updated: z.string().optional(),
    issuelinks: z.array(issueLinkSchema).optional().catch(undefined),
    // A malformed attachment list shouldn't stop the issue from loading.
    attachment: z.array(attachmentSchema).nullish().catch(null),
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
