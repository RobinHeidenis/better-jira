import { createStore } from "@tanstack/react-store";
import type { VirtualItem } from "@tanstack/react-virtual";
import { issueDeveloper, type JiraBoardIssue } from "#/lib/api/issues";

/** Board search state. Lives for the tab only, so it isn't in settings. */
export const boardSearch = createStore<{
  query: string;
  activeIssueId: string | null;
  /** The card whose status menu is open. */
  statusMenuIssueId: string | null;
  /** The card and role whose people picker is open. */
  peopleMenu: { issueId: string; role: "assignee" | "developer" } | null;
}>({
  query: "",
  activeIssueId: null,
  statusMenuIssueId: null,
  peopleMenu: null,
});

// Keyed on the issue object, so a refetch (new objects) rebuilds it.
const searchTextCache = new WeakMap<JiraBoardIssue, string>();

const searchText = (issue: JiraBoardIssue, developerField: string | null) => {
  const cached = searchTextCache.get(issue);
  if (cached !== undefined) return cached;
  const text = buildSearchText(issue, developerField);
  searchTextCache.set(issue, text);
  return text;
};

const buildSearchText = (
  issue: JiraBoardIssue,
  developerField: string | null,
) =>
  [
    issue.key,
    issue.fields.summary,
    issue.fields.parent?.key,
    issue.fields.parent?.fields.summary,
    issue.fields.assignee?.displayName,
    issueDeveloper(issue, developerField)?.displayName,
    ...issue.fields.labels,
    ...(issue.fields.fixVersions ?? []).map((version) => version.name),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();

/** Every word of the query has to appear somewhere on the card. */
export const matchesSearch = (
  issue: JiraBoardIssue,
  query: string,
  developerField: string | null,
) => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const text = searchText(issue, developerField);
  return terms.every((term) => text.includes(term));
};

/** The card being dragged to another column. */
export const boardDrag = createStore<{
  id: string;
  key: string;
  summary: string;
  column: string;
} | null>(null);

/**
 * Where the board was scrolled and how tall each column's cards measured,
 * so coming back from a ticket lands on the same spot. Columns only render
 * the cards in view, so without the heights they'd be rebuilt from estimates
 * and the restored position would drift.
 */
export const boardScroll = {
  top: 0,
  left: 0,
  measurements: new Map<string, VirtualItem[]>(),
};
