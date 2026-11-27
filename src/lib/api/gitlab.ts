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
    // GitLab explains refusals in the body, like a missing token scope.
    const body = await response.json().catch(() => null);
    const detail =
      body && typeof body === "object"
        ? (body.message ?? body.error_description ?? body.error)
        : null;
    throw new Error(
      `GitLab error: ${response.status} ${response.statusText}${
        detail
          ? ` (${typeof detail === "string" ? detail : JSON.stringify(detail)})`
          : ""
      }`,
    );
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
  project_id: z.number(),
  has_conflicts: z.boolean().optional(),
  title: z.string(),
  state: z.enum(["opened", "closed", "locked", "merged"]),
  draft: z.boolean().optional(),
  web_url: z.string(),
  source_branch: z.string(),
  updated_at: z.string(),
  merged_at: z.string().nullish(),
  references: z.object({ full: z.string() }),
  author: z
    .object({
      id: z.number().optional(),
      name: z.string(),
      avatar_url: z.string().nullish(),
    })
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
    queryKey: ["gitlab-merge-requests", 2, issueKey, projectIds],
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
      2,
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
      // `fetchQuery` reuses a fresh copy but refetches a stale one, where
      // `ensureQueryData` would hand back any cached copy however old.
      const results = await Promise.all(
        tickets.map((ticket) =>
          client.fetchQuery(mergeRequestsOptions(ticket.key, projectIds)),
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

const pipelineStatusSchema = z.object({
  head_pipeline: z
    .object({
      status: z.string(),
      web_url: z.string(),
    })
    .nullish(),
});

const approvalsSchema = z.object({
  approved: z.boolean().optional(),
  approvals_left: z.number().optional(),
  approved_by: z.array(z.object({ user: z.object({ name: z.string() }) })),
});

export type MergeRequestDetail = {
  pipeline: { status: string; url: string } | null;
  approvedBy: string[];
  approvalsLeft: number;
};

/**
 * The list endpoint leaves out the pipeline and approvals, so these cost a
 * request each and are only fetched for open MRs that are on screen.
 */
export const mergeRequestDetailOptions = (projectId: number, iid: number) => {
  return queryOptions({
    queryKey: ["gitlab-merge-request-detail", projectId, iid],
    queryFn: async (): Promise<MergeRequestDetail> => {
      const base = `/projects/${projectId}/merge_requests/${iid}`;
      const [mergeRequest, approvals] = await Promise.all([
        request(base, pipelineStatusSchema),
        request(`${base}/approvals`, approvalsSchema),
      ]);
      return {
        pipeline: mergeRequest.head_pipeline
          ? {
              status: mergeRequest.head_pipeline.status,
              url: mergeRequest.head_pipeline.web_url,
            }
          : null,
        approvedBy: approvals.approved_by.map((approval) => approval.user.name),
        approvalsLeft: approvals.approvals_left ?? 0,
      };
    },
    // A pipeline in progress is worth watching while it's on screen.
    refetchInterval: (query) =>
      [
        "running",
        "pending",
        "created",
        "preparing",
        "waiting_for_resource",
      ].includes(query.state.data?.pipeline?.status ?? "")
        ? 15 * 1000
        : false,
  });
};

/** The token owner's user id. Needs the `read_user` scope. */
export const gitlabUserIdOptions = () =>
  queryOptions({
    queryKey: ["gitlab-user-id", 2],
    queryFn: async () =>
      (await request("/user", z.object({ id: z.number() }))).id,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
  });

const listOpenMergeRequests = (filter: Record<string, string>) =>
  request(
    `/merge_requests?${new URLSearchParams({
      state: "opened",
      per_page: "100",
      ...filter,
    })}`,
    z.array(mergeRequestSchema),
  );

const newest = (a: MergeRequest, b: MergeRequest) =>
  b.updated_at.localeCompare(a.updated_at);

// GitLab answers these across every project, so the rest are dropped.
const inProjects = (projectIds: number[]) => (mergeRequest: MergeRequest) =>
  projectIds.includes(mergeRequest.project_id);

/** Open merge requests in the selected projects the user is a reviewer on. */
export const reviewMergeRequestsOptions = (projectIds: number[]) =>
  queryOptions({
    queryKey: ["gitlab-review-merge-requests", projectIds],
    queryFn: async ({ client }) => {
      const userId = await client.fetchQuery(gitlabUserIdOptions());
      const list = await listOpenMergeRequests({
        scope: "all",
        reviewer_id: String(userId),
      });
      return list.filter(inProjects(projectIds)).sort(newest);
    },
    refetchInterval: 2 * 60 * 1000,
  });

/** The user's own open merge requests in the selected projects. */
export const authoredMergeRequestsOptions = (projectIds: number[]) =>
  queryOptions({
    queryKey: ["gitlab-authored-merge-requests", projectIds],
    queryFn: async () => {
      const list = await listOpenMergeRequests({ scope: "created_by_me" });
      return list.filter(inProjects(projectIds)).sort(newest);
    },
    refetchInterval: 2 * 60 * 1000,
  });

const noteSchema = z.object({
  body: z.string(),
  system: z.boolean(),
  created_at: z.string(),
  author: z.object({ id: z.number() }),
});

export type ReviewedMergeRequest = MergeRequest & {
  approved: boolean;
  comments: number;
};

/**
 * Merge requests the user reviewed since a moment: approved or commented on.
 * GitLab records an approval as a system note, so the notes cover both.
 */
export const reviewedMergeRequestsOptions = (
  projectIds: number[],
  since: string,
) =>
  queryOptions({
    queryKey: ["gitlab-reviewed-merge-requests", projectIds, since],
    queryFn: async ({ client }) => {
      const userId = await client.fetchQuery(gitlabUserIdOptions());
      const candidates = (
        await request(
          `/merge_requests?${new URLSearchParams({
            scope: "all",
            state: "all",
            reviewer_id: String(userId),
            updated_after: since,
            per_page: "100",
          })}`,
          z.array(mergeRequestSchema),
        )
      ).filter(inProjects(projectIds));

      const reviewed = await Promise.all(
        candidates.map(async (mergeRequest) => {
          const notes = await request(
            `/projects/${mergeRequest.project_id}/merge_requests/${mergeRequest.iid}/notes?${new URLSearchParams(
              { sort: "desc", order_by: "created_at", per_page: "100" },
            )}`,
            z.array(noteSchema),
          );
          const mine = notes.filter(
            (note) => note.author.id === userId && note.created_at >= since,
          );
          return {
            ...mergeRequest,
            approved: mine.some(
              (note) => note.system && /^approved\b/i.test(note.body),
            ),
            comments: mine.filter((note) => !note.system).length,
          };
        }),
      );
      return reviewed
        .filter(
          (mergeRequest) => mergeRequest.approved || mergeRequest.comments,
        )
        .sort(newest);
    },
  });

/** The user's merge requests merged since a moment. */
export const mergedMergeRequestsOptions = (
  projectIds: number[],
  since: string,
) =>
  queryOptions({
    queryKey: ["gitlab-merged-merge-requests", projectIds, since],
    queryFn: async () => {
      const list = await request(
        `/merge_requests?${new URLSearchParams({
          scope: "created_by_me",
          state: "merged",
          updated_after: since,
          per_page: "100",
        })}`,
        z.array(mergeRequestSchema),
      );
      return list
        .filter(inProjects(projectIds))
        .filter((mergeRequest) => (mergeRequest.merged_at ?? "") >= since)
        .sort(newest);
    },
  });
