import type { QueryClient } from "@tanstack/react-query";
import { type IssueEdit, updateIssue } from "./api/edit";
import { type IssuesByStatusId, issueOptions } from "./api/issues";
import { reportError } from "./transition";

const isBoardIssues = (queryKey: readonly unknown[]) =>
  queryKey[0] === "boards" && queryKey[2] === "issues";

/**
 * Saves an edit to an issue. `display` is what the cached issue shows until
 * Jira's copy is back, in the shape Jira returns, since that can differ from
 * what it takes (`{ accountId }` in, a whole user out).
 */
export const editIssue = async (
  queryClient: QueryClient,
  issueKey: string,
  edit: IssueEdit,
  display: Record<string, unknown>,
) => {
  queryClient.setQueriesData<IssuesByStatusId>(
    { predicate: (query) => isBoardIssues(query.queryKey) },
    (board) =>
      board &&
      Object.fromEntries(
        Object.entries(board).map(([statusId, issues]) => [
          statusId,
          issues.map((issue) =>
            issue.key === issueKey
              ? { ...issue, fields: { ...issue.fields, ...display } }
              : issue,
          ),
        ]),
      ),
  );
  queryClient.setQueryData(issueOptions(issueKey).queryKey, (issue) =>
    issue ? { ...issue, fields: { ...issue.fields, ...display } } : issue,
  );

  try {
    await updateIssue(issueKey, edit);
  } catch (error) {
    reportError(
      `Couldn't update ${issueKey}: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    void queryClient.invalidateQueries({
      queryKey: issueOptions(issueKey).queryKey,
      exact: true,
    });
    void queryClient.invalidateQueries({
      predicate: (query) => isBoardIssues(query.queryKey),
    });
  }
};
