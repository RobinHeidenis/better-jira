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
const jqlField = (fieldId: string) =>
  fieldId.replace(/^customfield_(\d+)$/, "cf[$1]");

const MAX_PAGES = 5;

/** Open tickets the current user is assignee or developer on. */
const getMyIssues = async (
  client: QueryClient,
  developerField: string | null,
) => {
  const who = [
    "assignee = currentUser()",
    ...(developerField ? [`${jqlField(developerField)} = currentUser()`] : []),
  ].join(" OR ");
  const jql = `(${who}) AND statusCategory != Done ORDER BY updated DESC`;
  const fields = [
    "summary",
    "status",
    "issuetype",
    "priority",
    "parent",
    "assignee",
    "updated",
    ...(developerField ? [developerField] : []),
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

export const myIssuesOptions = () => {
  const { developerField } = store.get();
  return queryOptions({
    queryKey: ["my-work", "issues", developerField],
    queryFn: ({ client }) => getMyIssues(client, developerField),
    refetchOnWindowFocus: refetchOnReturn,
  });
};
