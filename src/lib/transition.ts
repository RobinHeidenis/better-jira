import type { QueryClient } from "@tanstack/react-query";
import { createStore } from "@tanstack/react-store";
import { plainTextToAdf } from "./api/comments";
import { currentUserOptions } from "./api/current-user";
import { type IssuesByStatusId, issueOptions } from "./api/issues";
import { type Transition, transitionIssue } from "./api/transitions";
import { reloadIssue } from "./reload-issue";
import { store } from "./store";
import {
  type FormField,
  type FormValues,
  formFields,
  isEmpty,
  missingFields,
} from "./transition-form";

export type TransitionTarget = {
  key: string;
  summary?: string;
};

/** The transition waiting on its form, if any. */
export const transitionDialog = createStore<{
  issue: TransitionTarget;
  transition: Transition;
} | null>(null);

export const transitionErrors = createStore<{ id: number; message: string }[]>(
  [],
);

let nextErrorId = 0;
export const reportError = (message: string) =>
  transitionErrors.setState((errors) => [
    ...errors,
    { id: nextErrorId++, message },
  ]);

export const dismissTransitionError = (id: number) =>
  transitionErrors.setState((errors) =>
    errors.filter((error) => error.id !== id),
  );

/** The `fields` of a transition request. Empty values are left out. */
const transitionPayload = (
  fields: FormField[],
  values: FormValues,
  myAccountId: string | undefined,
) => {
  const payload: Record<string, unknown> = {};
  for (const { key, kind } of fields) {
    const value = values[key];
    if (!kind || !value || isEmpty(value)) continue;
    switch (value.kind) {
      case "me":
        if (myAccountId) payload[key] = { accountId: myAccountId };
        break;
      case "unassigned":
        payload[key] = null;
        break;
      case "user":
        payload[key] = { accountId: value.accountId };
        break;
      case "option":
        payload[key] = { id: value.id };
        break;
      case "options":
        payload[key] = value.items.map((item) => ({ id: item.id }));
        break;
      case "text":
        payload[key] =
          kind === "textarea" ? plainTextToAdf(value.text) : value.text;
        break;
      case "number":
        payload[key] = value.number;
        break;
    }
  }
  return payload;
};

const isBoardIssues = (queryKey: readonly unknown[]) =>
  queryKey[0] === "boards" && queryKey[2] === "issues";

/** Shows the issue in its new status straight away, ahead of Jira. */
const moveInCaches = (
  queryClient: QueryClient,
  issueKey: string,
  transition: Transition,
) => {
  const status = {
    id: transition.to.id,
    name: transition.to.name,
    statusCategory: transition.to.statusCategory ?? { name: "" },
  };
  queryClient.setQueriesData<IssuesByStatusId>(
    { predicate: (query) => isBoardIssues(query.queryKey) },
    (board) => {
      if (!board) return board;
      const next: IssuesByStatusId = {};
      let moved: IssuesByStatusId[string][number] | undefined;
      for (const [statusId, issues] of Object.entries(board)) {
        next[statusId] = issues.filter((issue) => {
          if (issue.key !== issueKey) return true;
          moved = issue;
          return false;
        });
      }
      if (moved) {
        next[status.id] = [
          { ...moved, fields: { ...moved.fields, status } },
          ...(next[status.id] ?? []),
        ];
      }
      return next;
    },
  );
  queryClient.setQueryData(issueOptions(issueKey).queryKey, (issue) =>
    issue ? { ...issue, fields: { ...issue.fields, status } } : issue,
  );
};

export const runTransition = async (
  queryClient: QueryClient,
  issue: TransitionTarget,
  transition: Transition,
  values: FormValues,
) => {
  const fields = formFields(transition);
  const needsMe = Object.values(values).some((value) => value?.kind === "me");
  const me = needsMe
    ? await queryClient.ensureQueryData(currentUserOptions())
    : undefined;

  moveInCaches(queryClient, issue.key, transition);
  try {
    await transitionIssue(
      issue.key,
      transition.id,
      transitionPayload(fields, values, me?.accountId),
    );
  } catch (error) {
    reportError(
      `Couldn't move ${issue.key} to ${transition.to.name}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  } finally {
    reloadIssue(queryClient, issue.key);
  }
};

/** The saved defaults for transitions into this status. */
export const formDefaults = (transition: Transition): FormValues =>
  store.state.transitionForms[transition.to.id]?.defaults ?? {};

/**
 * Moves the issue straight away when the lane's form asks for nothing, and
 * opens the form otherwise.
 */
export const startTransition = (
  queryClient: QueryClient,
  issue: TransitionTarget,
  transition: Transition,
) => {
  const hidden = new Set(
    store.state.transitionForms[transition.to.id]?.hidden ?? [],
  );
  const fields = formFields(transition);
  const values = formDefaults(transition);
  const asked = fields.filter((entry) => !hidden.has(entry.key));
  if (!asked.length && !missingFields(fields, values).length) {
    void runTransition(queryClient, issue, transition, values);
    return;
  }
  transitionDialog.setState(() => ({ issue, transition }));
};
