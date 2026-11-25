import type { QueryClient } from "@tanstack/react-query";

const isBoardIssues = (queryKey: readonly unknown[]) =>
  queryKey[0] === "boards" && queryKey[2] === "issues";

// Jira automations react to a change a few seconds after it, and can change
// more fields (a rule clearing the developer when the assignee is cleared).
const AUTOMATION_DELAY_MS = 5000;
const pending = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Reloads an issue and the board after a change: once straight away, and
 * once more after automations have had time to run.
 */
export const reloadIssue = (queryClient: QueryClient, issueKey: string) => {
  const reload = () => {
    // The issue's other queries (transitions, comments) hang off its key.
    void queryClient.invalidateQueries({ queryKey: ["issue", issueKey] });
    void queryClient.invalidateQueries({
      predicate: (query) => isBoardIssues(query.queryKey),
    });
  };
  reload();
  clearTimeout(pending.get(issueKey));
  pending.set(
    issueKey,
    setTimeout(() => {
      pending.delete(issueKey);
      reload();
    }, AUTOMATION_DELAY_MS),
  );
};
