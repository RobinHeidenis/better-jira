import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { useRef } from "react";
import { boardConfigurationOptions, boardJql } from "#/lib/api/boards";
import { store } from "#/lib/store";
import { BoardFilters } from "./board-filters";
import { Column } from "./column";

export const Board = () => {
  const boardId = useSelector(store, (state) => state.boardId);
  const { data: board } = useQuery(boardConfigurationOptions(boardId));
  const scrollRef = useRef<HTMLDivElement>(null);

  if (boardId === null || !board) return null;

  const jql = boardJql(board.filter.id, board.subQuery?.query);

  return (
    <>
      <BoardFilters />
      <div
        ref={scrollRef}
        className="relative mt-5 min-h-0 flex-1 overflow-auto"
      >
        <div className="flex min-h-full w-max gap-2">
          {board.columnConfig.columns.map((column) => (
            <Column
              boardId={boardId}
              name={column.name}
              statusIds={column.statuses.map((status) => status.id)}
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
