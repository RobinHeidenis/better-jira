import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { store } from "../store";
import { request } from "./api";
import { currentUserOptions } from "./current-user";
import { refetchOnReturn } from "./refetch";

const userRefSchema = z.object({ accountId: z.string() }).nullish();

const myIssueSchema = z.object({
  id: z.string(),
  key: z.string(),
  fields: z.looseObject({
    summary: z.string(),
    status: z.object({
      id: z.string(),
      name: z.string(),
      statusCategory: z.object({ name: z.string() }).optional(),
    }),
    issuetype: z
      .object({ name: z.string(), iconUrl: z.string().optional() })
      .optional(),
    priority: z
      .object({ name: z.string(), iconUrl: z.string().optional() })
      .nullish(),
    parent: z
      .object({ key: z.string(), fields: z.object({ summary: z.string() }) })
      .nullish(),
    assignee: userRefSchema,
    updated: z.string(),
  }),
});

export type MyIssue = z.infer<typeof myIssueSchema> & {
  roles: ("assignee" | "developer")[];
};

const pageSchema = z.object({
  issues: z.array(myIssueSchema),
  nextPageToken: z.string().nullish(),
});

/** `customfield_10031` → `cf[10031]`, the form JQL accepts for any site. */
export const jqlField = (fieldId: string) =>
  fieldId.replace(/^customfield_(\d+)$/, "cf[$1]");

const MAX_PAGES = 5;

/** Who the current user is on a ticket, as JQL. */
export const mineJql = (developerField: string | null) =>
  [
    "assignee = currentUser()",
    ...(developerField ? [`${jqlField(developerField)} = currentUser()`] : []),
  ].join(" OR ");

/** Runs a JQL search and marks which roles the current user has on each. */
export const searchWithRoles = async (
  client: QueryClient,
  jql: string,
  developerField: string | null,
  extraFields: string[] = [],
) => {
  const fields = [
    "summary",
    "status",
    "issuetype",
    "priority",
    "parent",
    "assignee",
    "updated",
    ...(developerField ? [developerField] : []),
    ...extraFields,
  ].join(",");

  const issues: z.infer<typeof myIssueSchema>[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({ jql, fields, maxResults: "100" });
    if (pageToken) params.set("nextPageToken", pageToken);
    const result = await request(
      `search/jql?${params}`,
      pageSchema,
      "atlassian",
    );
    issues.push(...result.issues);
    pageToken = result.nextPageToken ?? undefined;
    if (!pageToken) break;
  }

  const { accountId } = await client.ensureQueryData(currentUserOptions());
  return issues.map((issue): MyIssue => {
    const developer = developerField
      ? userRefSchema.catch(null).parse(issue.fields[developerField])
      : null;
    return {
      ...issue,
      roles: [
        ...(issue.fields.assignee?.accountId === accountId
          ? (["assignee"] as const)
          : []),
        ...(developer?.accountId === accountId ? (["developer"] as const) : []),
      ],
    };
  });
};

/** Open tickets the current user is assignee or developer on. */
const getMyIssues = (client: QueryClient, developerField: string | null) =>
  searchWithRoles(
    client,
    `(${mineJql(developerField)}) AND statusCategory != Done ORDER BY updated DESC`,
    developerField,
  );

export const myIssuesOptions = () => {
  const { developerField } = store.get();
  return queryOptions({
    queryKey: ["my-work", "issues", developerField],
    queryFn: ({ client }) => getMyIssues(client, developerField),
    refetchOnWindowFocus: refetchOnReturn,
  });
};
