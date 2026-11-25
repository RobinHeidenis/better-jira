import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { store } from "../store";

const request = async <TSchema extends z.ZodType>(
  endpoint: string,
  schema: TSchema,
  options: RequestInit = {},
  token = store.get().gitlabApiKey,
) => {
  const url = `https://gitlab.com/api/v4${endpoint}`;

  if (token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`GitLab error: ${response.status} ${response.statusText}`);
  }

  return schema.parse(await response.json());
};

const projectSchema = z.object({
  id: z.number(),
  name_with_namespace: z.string(),
});

const getProjects = async (token: string) =>
  await request(
    "/projects?membership=true&simple=true&active=true&per_page=100",
    z.array(projectSchema),
    {},
    token,
  );

// Setup lists projects for a token that isn't saved yet, so it is passed in
// rather than read from the store.
export const gitlabProjectsOptions = (token: string | null) => {
  return queryOptions({
    queryKey: ["gitlab-projects", token],
    queryFn: token ? () => getProjects(token) : skipToken,
    retry: false,
  });
};

const mergeRequestSchema = z.object({
  id: z.number(),
  iid: z.number(),
  title: z.string(),
  state: z.enum(["opened", "closed", "locked", "merged"]),
  draft: z.boolean().optional(),
  web_url: z.string(),
  source_branch: z.string(),
  updated_at: z.string(),
  references: z.object({ full: z.string() }),
  author: z
    .object({ name: z.string(), avatar_url: z.string().nullish() })
    .nullish(),
});

export type MergeRequest = z.infer<typeof mergeRequestSchema>;

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GitLab's search is a substring match, so HR-12 would also find HR-123.
const mentionsKey = (mergeRequest: MergeRequest, issueKey: string) => {
  const pattern = new RegExp(
    `(^|[^A-Za-z0-9])${escapeRegExp(issueKey)}($|[^0-9])`,
    "i",
  );
  return (
    pattern.test(mergeRequest.title) || pattern.test(mergeRequest.source_branch)
  );
};

const getMergeRequests = async (issueKey: string, projectIds: number[]) => {
  const params = new URLSearchParams({
    search: issueKey,
    in: "title",
    state: "all",
    per_page: "20",
  });
  const perProject = await Promise.all(
    projectIds.map((projectId) =>
      request(
        `/projects/${projectId}/merge_requests?${params}`,
        z.array(mergeRequestSchema),
      ),
    ),
  );
  return perProject
    .flat()
    .filter((mergeRequest) => mentionsKey(mergeRequest, issueKey))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
};

/** Merge requests in the selected projects whose title or branch names the issue. */
export const mergeRequestsOptions = (
  issueKey: string,
  projectIds: number[],
) => {
  return queryOptions({
    queryKey: ["gitlab-merge-requests", issueKey, projectIds],
    queryFn: () => getMergeRequests(issueKey, projectIds),
  });
};

export type TicketMergeRequests = {
  key: string;
  summary: string | null;
  mergeRequests: MergeRequest[];
};

/**
 * The issue's merge requests followed by its subtasks', one group per ticket.
 * Each key is its own cached query, so a subtask card reuses what its
 * parent's popover already loaded.
 */
export const ticketMergeRequestsOptions = (
  issue: { key: string; subtasks: { key: string; summary: string }[] },
  projectIds: number[],
) => {
  return queryOptions({
    queryKey: [
      "gitlab-ticket-merge-requests",
      issue.key,
      issue.subtasks.map((subtask) => subtask.key),
      projectIds,
    ],
    queryFn: async ({ client }): Promise<TicketMergeRequests[]> => {
      const tickets = [
        { key: issue.key, summary: null },
        ...issue.subtasks.map((subtask) => ({
          key: subtask.key,
          summary: subtask.summary,
        })),
      ];
      const results = await Promise.all(
        tickets.map((ticket) =>
          client.ensureQueryData(mergeRequestsOptions(ticket.key, projectIds)),
        ),
      );
      // An MR naming both the story and a subtask only shows under the first.
      const seen = new Set<number>();
      return tickets.map((ticket, index) => ({
        ...ticket,
        mergeRequests: (results[index] ?? []).filter((mergeRequest) => {
          if (seen.has(mergeRequest.id)) return false;
          seen.add(mergeRequest.id);
          return true;
        }),
      }));
    },
  });
};
