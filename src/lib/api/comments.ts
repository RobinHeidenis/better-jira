import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { request } from "./api";

const commentSchema = z.object({
  id: z.string(),
  author: z
    .object({
      accountId: z.string().optional(),
      displayName: z.string(),
      avatarUrls: z.object({ "48x48": z.string().nullish() }).optional(),
    })
    .nullish(),
  // Like the description, the body is rendered leniently rather than parsed.
  body: z.object({ content: z.any() }).nullish(),
  created: z.string(),
  updated: z.string().optional(),
});

export type JiraComment = z.infer<typeof commentSchema>;

const commentPageSchema = z.object({
  comments: z.array(commentSchema),
  startAt: z.number(),
  total: z.number(),
});

const PAGE_SIZE = 100;
// A ticket with more than this many comments is rare; the rest stay in Jira.
const MAX_PAGES = 5;

export const getComments = async (issueKey: string) => {
  const comments: JiraComment[] = [];
  let total = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      orderBy: "-created",
      startAt: String(page * PAGE_SIZE),
      maxResults: String(PAGE_SIZE),
    });
    const result = await request(
      `issue/${issueKey}/comment?${params}`,
      commentPageSchema,
      "atlassian",
    );
    comments.push(...result.comments);
    total = result.total;
    if (comments.length >= total || !result.comments.length) break;
  }
  return { comments, total };
};

export const commentsOptions = (issueKey: string) => {
  return queryOptions({
    queryKey: ["issue", issueKey, "comments"],
    queryFn: () => getComments(issueKey),
  });
};

type AdfInline =
  | {
      type: "text";
      text: string;
      marks?: { type: "link"; attrs: { href: string } }[];
    }
  | { type: "hardBreak" };

const URL_PATTERN = /https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/g;

/** A line of plain text with its URLs turned into links. */
const lineToAdf = (line: string): AdfInline[] => {
  const nodes: AdfInline[] = [];
  let last = 0;
  for (const match of line.matchAll(URL_PATTERN)) {
    const start = match.index ?? 0;
    if (start > last)
      nodes.push({ type: "text", text: line.slice(last, start) });
    nodes.push({
      type: "text",
      text: match[0],
      marks: [{ type: "link", attrs: { href: match[0] } }],
    });
    last = start + match[0].length;
  }
  if (last < line.length) nodes.push({ type: "text", text: line.slice(last) });
  return nodes;
};

/**
 * Plain text as an ADF document: blank lines start a new paragraph, single
 * line breaks stay line breaks.
 */
export const plainTextToAdf = (text: string) => ({
  type: "doc",
  version: 1,
  content: text
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => ({
      type: "paragraph",
      content: paragraph
        .split("\n")
        .flatMap((line, index): AdfInline[] => [
          ...(index > 0 ? [{ type: "hardBreak" } as const] : []),
          ...lineToAdf(line),
        ]),
    })),
});

export const addComment = async (issueKey: string, text: string) => {
  return await request(
    `issue/${issueKey}/comment`,
    commentSchema,
    "atlassian",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: plainTextToAdf(text) }),
    },
  );
};
