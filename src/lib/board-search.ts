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

export type SelectedIssue = {
  id: string;
  key: string;
  summary: string;
  statusId: string;
};

/** Cards picked for a bulk action, and the last one clicked for ranges. */
export const boardSelection = createStore<{
  issues: SelectedIssue[];
  anchorId: string | null;
}>({ issues: [], anchorId: null });

export const clearSelection = () =>
  boardSelection.setState(() => ({ issues: [], anchorId: null }));

const toSelected = (issue: JiraBoardIssue): SelectedIssue => ({
  id: issue.id,
  key: issue.key,
  summary: issue.fields.summary,
  statusId: issue.fields.status.id,
});

/**
 * Cmd/Ctrl-click toggles one card. Shift-click adds the cards between the
 * last one clicked and this one, when both are in the same column.
 */
export const selectCard = (
  issue: JiraBoardIssue,
  column: JiraBoardIssue[],
  range: boolean,
) =>
  boardSelection.setState(({ issues, anchorId }) => {
    const anchorIndex = column.findIndex((other) => other.id === anchorId);
    const index = column.findIndex((other) => other.id === issue.id);
    if (range && anchorIndex !== -1 && index !== -1) {
      const [from, to] = [anchorIndex, index].sort((a, b) => a - b);
      const ids = new Set(issues.map((selected) => selected.id));
      const added = column
        .slice(from, to + 1)
        .filter((other) => !ids.has(other.id))
        .map(toSelected);
      return { issues: [...issues, ...added], anchorId: issue.id };
    }
    const selected = issues.some((other) => other.id === issue.id);
    return {
      issues: selected
        ? issues.filter((other) => other.id !== issue.id)
        : [...issues, toSelected(issue)],
      anchorId: issue.id,
    };
  });
