import { createStore } from "@tanstack/react-store";
import { issueDeveloper, type JiraBoardIssue } from "#/lib/api/issues";

/** Board search state. Lives for the tab only, so it isn't in settings. */
export const boardSearch = createStore<{
  query: string;
  activeIssueId: string | null;
}>({ query: "", activeIssueId: null });

const searchText = (issue: JiraBoardIssue, developerField: string | null) =>
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
