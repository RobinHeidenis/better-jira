import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { useLayoutEffect, useRef } from "react";
import { boardConfigurationOptions, boardJql } from "#/lib/api/boards";
import { boardScroll } from "#/lib/board-search";
import { store } from "#/lib/store";
import { BoardFilters } from "./board-filters";
import { BoardKeyboard } from "./board-keyboard";
import { BoardSearch } from "./board-search";
import { BulkActions } from "./bulk-actions";
import { Column } from "./column";
import { ErrorState } from "./error-state";
import { Spinner } from "./ui/spinner";
import { useBoardIssues } from "./use-board-issues";

export const Board = () => {
  const boardId = useSelector(store, (state) => state.boardId);
  const {
    data: board,
    error,
    refetch,
  } = useQuery(boardConfigurationOptions(boardId));
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasBoard = !!board;

  // Columns lay out before this runs, so the content is already tall enough.
  useLayoutEffect(() => {
    if (!hasBoard || !scrollRef.current) return;
    scrollRef.current.scrollTo(boardScroll.left, boardScroll.top);
  }, [hasBoard]);

  if (boardId === null) return null;
  if (error) {
    return (
      <ErrorState
        title="Couldn't load the board"
        error={error}
        onRetry={() => refetch()}
      />
    );
  }
  if (!board) {
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    );
  }

  const jql = boardJql(board.filter.id, board.subQuery?.query);
  const columns = board.columnConfig.columns.map((column) => ({
    name: column.name,
    statusIds: column.statuses.map((status) => status.id),
  }));

  return (
    <>
      <BoardKeyboard boardId={boardId} jql={jql} columns={columns} />
      <BulkActions />
      <BoardFilters
        search={<BoardSearch boardId={boardId} jql={jql} columns={columns} />}
      />
      <BoardIssuesError boardId={boardId} jql={jql} />
      <div
        ref={scrollRef}
        className="relative mt-5 min-h-0 flex-1 overflow-auto"
        onScroll={(event) => {
          boardScroll.top = event.currentTarget.scrollTop;
          boardScroll.left = event.currentTarget.scrollLeft;
        }}
      >
        <div className="flex min-h-full w-max gap-2">
          {columns.map((column) => (
            <Column
              boardId={boardId}
              name={column.name}
              statusIds={column.statusIds}
              jql={jql}
              scrollRef={scrollRef}
              key={column.name}
            />
          ))}
        </div>
      </div>
    </>
  );
};

const BoardIssuesError = ({
  boardId,
  jql,
}: {
  boardId: number;
  jql: string;
}) => {
  const { error, refetch } = useBoardIssues(boardId, jql);
  if (!error) return null;
  return (
    <div className="mt-5">
      <ErrorState
        title="Couldn't load the board's tickets"
        error={error}
        onRetry={() => refetch()}
      />
    </div>
  );
};
