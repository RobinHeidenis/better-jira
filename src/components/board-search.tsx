import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiSearchLine,
} from "@remixicon/react";
import { useSelector } from "@tanstack/react-store";
import { useEffect, useRef } from "react";
import { boardSearch } from "#/lib/board-search";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "./ui/input-group";
import { useBoardIssues } from "./use-board-issues";

export type BoardSearchColumn = { name: string; statusIds: string[] };

export const BoardSearch = ({
  boardId,
  jql,
  columns,
}: {
  boardId: number;
  jql: string;
  columns: BoardSearchColumn[];
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const query = useSelector(boardSearch, (state) => state.query);
  const activeIssueId = useSelector(
    boardSearch,
    (state) => state.activeIssueId,
  );
  const { columnIssues, searching } = useBoardIssues(boardId, jql);

  const matches = searching
    ? columns.flatMap((column) =>
        columnIssues(column.name, column.statusIds).issues.map(
          (issue) => issue.id,
        ),
      )
    : [];
  const activeIndex = activeIssueId ? matches.indexOf(activeIssueId) : -1;

  // Like the browser's find: as soon as there are matches, the first one is
  // current, and a match that drops out hands over to the new first.
  const firstMatch = matches[0] ?? null;
  const activeIsMatch = activeIndex !== -1;
  useEffect(() => {
    if (!activeIsMatch && firstMatch) {
      boardSearch.setState((state) => ({
        ...state,
        activeIssueId: firstMatch,
      }));
    }
  }, [activeIsMatch, firstMatch]);

  const step = (direction: 1 | -1) => {
    if (!matches.length) return;
    const next =
      activeIndex === -1
        ? direction === 1
          ? 0
          : matches.length - 1
        : (activeIndex + direction + matches.length) % matches.length;
    boardSearch.setState((state) => ({
      ...state,
      activeIssueId: matches[next] ?? null,
    }));
  };

  const clear = () =>
    boardSearch.setState(() => ({ query: "", activeIssueId: null }));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "f")
        return;
      // A second press while the box has focus falls through to the
      // browser's own find, for text that is on screen.
      if (document.activeElement === inputRef.current) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <InputGroup className="w-72">
      <InputGroupAddon>
        <RiSearchLine />
      </InputGroupAddon>
      <InputGroupInput
        ref={inputRef}
        type="search"
        aria-label="Search the board"
        placeholder="Search the board"
        value={query}
        onChange={(event) =>
          boardSearch.setState(() => ({
            query: event.target.value,
            activeIssueId: null,
          }))
        }
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "ArrowDown") {
            event.preventDefault();
            step(event.key === "Enter" && event.shiftKey ? -1 : 1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            step(-1);
          } else if (event.key === "Escape") {
            event.preventDefault();
            clear();
            event.currentTarget.blur();
          }
        }}
      />
      {searching ? (
        <InputGroupAddon align="inline-end">
          <InputGroupText className="tabular-nums">
            {matches.length
              ? `${activeIndex === -1 ? "–" : activeIndex + 1}/${matches.length}`
              : "0"}
          </InputGroupText>
          <InputGroupButton
            size="icon-xs"
            aria-label="Previous match"
            onClick={() => step(-1)}
            disabled={!matches.length}
          >
            <RiArrowUpSLine />
          </InputGroupButton>
          <InputGroupButton
            size="icon-xs"
            aria-label="Next match"
            onClick={() => step(1)}
            disabled={!matches.length}
          >
            <RiArrowDownSLine />
          </InputGroupButton>
        </InputGroupAddon>
      ) : null}
    </InputGroup>
  );
};
