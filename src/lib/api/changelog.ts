import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { request } from "./api";
import { refetchOnReturn } from "./refetch";

const changeItemSchema = z.object({
  field: z.string(),
  fieldId: z.string().optional(),
  fromString: z.string().nullish(),
  toString: z.string().nullish(),
});

export type ChangeItem = z.infer<typeof changeItemSchema>;

const changeSchema = z.object({
  id: z.string(),
  author: z
    .object({
      accountId: z.string().optional(),
      displayName: z.string(),
      avatarUrls: z.object({ "48x48": z.string().nullish() }).optional(),
      accountType: z.string().optional(),
    })
    .nullish(),
  created: z.string(),
  items: z.array(changeItemSchema),
});

export type Change = z.infer<typeof changeSchema>;

const changelogPageSchema = z.object({
  values: z.array(changeSchema),
  total: z.number(),
});

const PAGE_SIZE = 100;
// Apps like checklists can write hundreds of entries; older ones stay in Jira.
const MAX_PAGES = 10;

const getPage = (issueKey: string, startAt: number) =>
  request(
    `issue/${issueKey}/changelog?${new URLSearchParams({
      startAt: String(startAt),
      maxResults: String(PAGE_SIZE),
    })}`,
    changelogPageSchema,
    "atlassian",
  );

/** The issue's changes, newest first. */
export const getChangelog = async (issueKey: string) => {
  // Jira lists the oldest first, so a long history is read from its end.
  const first = await getPage(issueKey, 0);
  const start = Math.max(0, first.total - MAX_PAGES * PAGE_SIZE);
  const changes = start === 0 ? [...first.values] : [];
  for (
    let startAt = start === 0 ? PAGE_SIZE : start;
    startAt < first.total;
    startAt += PAGE_SIZE
  ) {
    const page = await getPage(issueKey, startAt);
    if (!page.values.length) break;
    changes.push(...page.values);
  }
  return changes.reverse();
};

export const changelogOptions = (issueKey: string) =>
  queryOptions({
    queryKey: ["issue", issueKey, "changelog"],
    queryFn: () => getChangelog(issueKey),
    refetchOnWindowFocus: refetchOnReturn,
  });

/** Changes made by apps (checklists, automation) rather than people. */
export const isAppChange = (change: Change) =>
  change.author?.accountType === "app";
