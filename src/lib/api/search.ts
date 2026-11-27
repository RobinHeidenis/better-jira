import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { store } from "../store";
import { request } from "./api";

const foundIssueSchema = z.object({
  id: z.string(),
  key: z.string(),
  fields: z.object({
    summary: z.string(),
    status: z.object({
      id: z.string().optional(),
      name: z.string(),
      statusCategory: z.object({ name: z.string() }).optional(),
    }),
    issuetype: z
      .object({ name: z.string(), iconUrl: z.string().optional() })
      .optional(),
  }),
});

export type FoundIssue = z.infer<typeof foundIssueSchema>;

const searchResultSchema = z.object({ issues: z.array(foundIssueSchema) });

const FIELDS = "summary,status,issuetype";

const search = async (jql: string, maxResults: number) => {
  const params = new URLSearchParams({
    jql,
    fields: FIELDS,
    maxResults: String(maxResults),
  });
  const page = await request(
    `search/jql?${params}`,
    searchResultSchema,
    "atlassian",
  );
  return page.issues;
};

// A key Jira doesn't know makes a whole JQL query fail, so keys are looked up
// on their own and a miss just means no match.
const byKey = async (key: string) => {
  try {
    return [
      await request(
        `issue/${key}?fields=${FIELDS}`,
        foundIssueSchema,
        "atlassian",
      ),
    ];
  } catch {
    return [];
  }
};

/** Characters that are operators in Jira's text search. */
const TEXT_OPERATORS = /[+\-&|!(){}[\]^~*?\\:"/]/g;

const searchIssues = async (query: string) => {
  const trimmed = query.trim();
  if (!trimmed) {
    return search("issue in issueHistory() ORDER BY lastViewed DESC", 20);
  }

  const { project } = store.get();
  const key = /^[a-z][a-z0-9_]*-\d+$/i.test(trimmed)
    ? trimmed.toUpperCase()
    : /^\d+$/.test(trimmed) && project
      ? `${project}-${trimmed}`
      : null;

  const text = trimmed.replace(TEXT_OPERATORS, " ").replace(/\s+/g, " ").trim();
  const order = "ORDER BY lastViewed DESC, updated DESC";
  const [exact, inSummary, inText] = await Promise.all([
    key ? byKey(key) : [],
    text ? search(`summary ~ "${text}*" ${order}`, 20) : [],
    text ? search(`text ~ "${text}*" ORDER BY updated DESC`, 20) : [],
  ]);

  const seen = new Set<string>();
  return [...exact, ...inSummary, ...inText].filter((issue) => {
    if (seen.has(issue.id)) return false;
    seen.add(issue.id);
    return true;
  });
};

/** Any issue the user can see: recently viewed ones when the query is empty. */
export const issueSearchOptions = (query: string) =>
  queryOptions({
    queryKey: ["issue-search", query.trim()],
    queryFn: () => searchIssues(query),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
