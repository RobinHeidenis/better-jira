import { useNavigate } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { useEffect } from "react";
import { boardSearch } from "#/lib/board-search";
import { isPopupOpen } from "#/lib/utils";
import type { BoardSearchColumn } from "./board-search";
import { useBoardIssues } from "./use-board-issues";

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  !!target.closest("input, textarea, select, [contenteditable=true]");

/**
 * j/k move through a column, h/l between columns, Enter or o opens the card
 * and / jumps to search. The current card is the same one search highlights.
 */
export const BoardKeyboard = ({
  boardId,
  jql,
  columns,
}: {
  boardId: number;
  jql: string;
  columns: BoardSearchColumn[];
}) => {
  const navigate = useNavigate();
  const { columnIssues } = useBoardIssues(boardId, jql);
  const activeIssueId = useSelector(
    boardSearch,
    (state) => state.activeIssueId,
  );

  const grid = columns.map(
    (column) => columnIssues(column.name, column.statusIds).issues,
  );

  useEffect(() => {
    const setActive = (id: string | null) =>
      boardSearch.setState((state) => ({ ...state, activeIssueId: id }));

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target)) return;
      if (isPopupOpen()) return;

      if (event.key === "/") {
        event.preventDefault();
        document
          .querySelector<HTMLInputElement>(
            'input[aria-label="Search the board"]',
          )
          ?.focus();
        return;
      }

      let column = grid.findIndex((issues) =>
        issues.some((issue) => issue.id === activeIssueId),
      );
      let row =
        column === -1
          ? -1
          : (grid[column]?.findIndex((issue) => issue.id === activeIssueId) ??
            -1);

      const firstColumn = grid.findIndex((issues) => issues.length > 0);
      const moveColumn = (direction: 1 | -1) => {
        for (
          let next = column + direction;
          next >= 0 && next < grid.length;
          next += direction
        ) {
          const issues = grid[next];
          if (issues?.length) {
            column = next;
            row = Math.min(Math.max(row, 0), issues.length - 1);
            return true;
          }
        }
        return false;
      };

      switch (event.key) {
        case "j":
        case "k":
        case "h":
        case "l": {
          event.preventDefault();
          if (column === -1) {
            if (firstColumn === -1) return;
            column = firstColumn;
            row = 0;
          } else if (event.key === "j") {
            row = Math.min(row + 1, (grid[column]?.length ?? 1) - 1);
          } else if (event.key === "k") {
            row = Math.max(row - 1, 0);
          } else if (!moveColumn(event.key === "l" ? 1 : -1)) {
            return;
          }
          setActive(grid[column]?.[row]?.id ?? null);
          return;
        }
        case "Enter":
        case "o": {
          const issue = column === -1 ? null : grid[column]?.[row];
          if (!issue) return;
          event.preventDefault();
          navigate({ to: "/issue/$issueId", params: { issueId: issue.key } });
          return;
        }
        case "s": {
          const issue = column === -1 ? null : grid[column]?.[row];
          if (!issue) return;
          event.preventDefault();
          boardSearch.setState((state) => ({
            ...state,
            statusMenuIssueId: issue.id,
          }));
          return;
        }
        case "a":
        case "d": {
          const issue = column === -1 ? null : grid[column]?.[row];
          if (!issue) return;
          event.preventDefault();
          boardSearch.setState((state) => ({
            ...state,
            peopleMenu: {
              issueId: issue.id,
              role: event.key === "a" ? "assignee" : "developer",
            },
          }));
          return;
        }
        case "Escape":
          if (activeIssueId) setActive(null);
          return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return null;
};
