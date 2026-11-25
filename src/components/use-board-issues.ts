import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { useDeferredValue } from "react";
import { currentUserOptions } from "#/lib/api/current-user";
import {
  boardIssuesOptions,
  issueDeveloper,
  type JiraBoardIssue,
} from "#/lib/api/issues";
import { boardSearch, matchesSearch } from "#/lib/board-search";
import { sortForReview } from "#/lib/review-order";
import { store } from "#/lib/store";

/**
 * The board's issues with the user's filters, the search and the review
 * ordering applied. The board and each column share it, so the search's
 * match order is exactly the order the cards are shown in.
 */
export const useBoardIssues = (boardId: number, jql: string) => {
  const filters = useSelector(store, (state) => state.filter);
  const includeDevTickets = useSelector(
    store,
    (state) => state.includeDevTickets,
  );
  const developerField = useSelector(store, (state) => state.developerField);
  const storyPointsField = useSelector(
    store,
    (state) => state.storyPointsField,
  );
  const reviewColumn = useSelector(store, (state) => state.reviewColumn);
  // The input renders with the live query; the board follows at low priority,
  // so typing never waits on cards mounting and stale renders get dropped.
  const query = useDeferredValue(
    useSelector(boardSearch, (state) => state.query),
  );
  const { data: currentUser } = useQuery({
    ...currentUserOptions(),
    enabled: reviewColumn !== null,
  });
  const { data: issuesByStatusId, isPending } = useQuery(
    boardIssuesOptions(boardId, jql, { developerField, storyPointsField }),
  );

  const passesFilters = (issue: JiraBoardIssue) => {
    const users = filters?.users ?? [];
    if (users.length) {
      const assigned = users.includes(issue.fields.assignee?.accountId ?? "");
      const developed =
        includeDevTickets &&
        developerField !== null &&
        users.includes(issueDeveloper(issue, developerField)?.accountId ?? "");
      if (!assigned && !developed) return false;
    }

    const versions = filters?.versions ?? [];
    if (
      versions.length &&
      !issue.fields.fixVersions?.some((version) =>
        versions.includes(version.id),
      )
    ) {
      return false;
    }

    return matchesSearch(issue, query, developerField);
  };

  const columnIssues = (name: string, statusIds: string[]) => {
    const all = statusIds.flatMap(
      (statusId) => issuesByStatusId?.[statusId] ?? [],
    );
    const shown = all.filter(passesFilters);
    return {
      total: all.length,
      issues:
        name === reviewColumn && currentUser
          ? sortForReview(shown, currentUser.accountId, developerField)
          : shown,
    };
  };

  return {
    isPending,
    columnIssues,
    searching: query.trim() !== "",
    developerField,
    storyPointsField,
  };
};
