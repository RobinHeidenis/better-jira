import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { boardConfigurationOptions, boardJql } from "#/lib/api/boards";
import { store } from "#/lib/store";
import { Column } from "./column";

export const BoardColumns = () => {
  const boardId = useSelector(store, (state) => state.boardId)!;
  const { data: board } = useQuery(boardConfigurationOptions(boardId));

  // The column names and their status mappings both come from the board
  // configuration, so there's nothing to draw until it lands. The issues
  // themselves are the columns' own business, and stream in behind this.
  if (!board) return null;

  const jql = boardJql(board.filter.id, board.subQuery?.query);

  return (
    <>
      {board.columnConfig.columns.map((column) => (
        <Column
          name={column.name}
          statusIds={column.statuses.map((status) => status.id)}
          jql={jql}
          key={column.name}
        />
      ))}
    </>
  );
};
