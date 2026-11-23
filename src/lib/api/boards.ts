import { queryOptions, skipToken } from "@tanstack/react-query";
import z from "zod";
import { store } from "../store";
import { request } from "./api";

// All boards
export const boardSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  location: z.object({
    projectKey: z.string(),
  }),
});

const allBoardsSchema = z.object({
  values: z.array(boardSchema),
});

export const getAllBoards = async () => {
  return await request("board", allBoardsSchema);
};

export const allBoardsOptions = () => {
  return queryOptions({
    queryKey: ["boards"],
    queryFn: getAllBoards,
  });
};

// Board by ID
export const boardByIdSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string(),
  location: z.object({
    displayName: z.string(),
    name: z.string(),
    projectId: z.number(),
    projectKey: z.string(),
    projectName: z.string(),
    projectTypeKey: z.string(),
  }),
});

export const getBoardById = async (boardId: number) => {
  return await request(`board/${boardId}`, boardByIdSchema);
};

export const boardByIdOptions = (boardId: number) => {
  return queryOptions({
    queryKey: ["boards", boardId],
    queryFn: () => getBoardById(boardId),
  });
};

// Board configuration
const boardConfigurationSchema = z.object({
  columnConfig: z.object({
    columns: z.array(
      z.object({
        name: z.string(),
        statuses: z.array(
          z.object({
            id: z.string(),
          }),
        ),
      }),
    ),
    constraintType: z.string(),
  }),
  estimation: z
    .object({
      field: z.object({
        displayName: z.string(),
        fieldId: z.string(),
      }),
      type: z.string(),
    })
    .optional(),
  filter: z.object({
    id: z.string(),
  }),
  id: z.number(),
  location: z.object({
    id: z.string(),
    key: z.string(),
    name: z.string(),
    type: z.string(),
  }),
  name: z.string(),
  ranking: z.object({
    rankCustomFieldId: z.number().optional(),
  }),
  // Kanban only: the board's sub-filter. Jira applies the board's main filter
  // to `board/{id}/issue` itself, but not this, so callers have to pass it
  // along as `jql` or the Done column returns every issue ever finished.
  subQuery: z
    .object({
      query: z.string(),
    })
    .optional(),
});

export const getBoardConfiguration = async (
  boardId: number,
  showHiddenColumns = false,
) => {
  const result = await request(
    `board/${boardId}/configuration`,
    boardConfigurationSchema,
  );

  if (showHiddenColumns) {
    return result;
  }

  const hiddenColumns = store.get().hiddenColumns ?? [];

  const fiilteredColumns = result.columnConfig.columns.filter(
    (column) => !hiddenColumns.includes(column.name),
  );
  result.columnConfig.columns = fiilteredColumns;

  return result;
};

// Takes a nullable id so callers can mount the query before the user has
// picked a board: `skipToken` holds it idle instead of fetching `board/null`.
export const boardConfigurationOptions = (
  boardId: number | null,
  showHiddenColumns = false,
) => {
  return queryOptions({
    queryKey: ["boards", boardId, "configuration", showHiddenColumns],
    queryFn:
      boardId === null
        ? skipToken
        : () => getBoardConfiguration(boardId, showHiddenColumns),
  });
};

/**
 * How far back the Done column reaches. Jira's own boards cap this as well,
 * but it's a board *display* setting and isn't exposed anywhere in the REST
 * API — not on the filter, not on the sub-filter — so the window is ours to
 * pick. Without it the board drags in every issue ever finished.
 */
const DONE_WINDOW = "-14d";

/**
 * `statusCategoryChangedDate` rather than `resolutiondate`, because plenty of
 * workflows move an issue into a Done-category status without ever setting a
 * resolution, and those would drop out of the column entirely.
 */
const RECENTLY_DONE = `statusCategory != Done OR statusCategoryChangedDate >= ${DONE_WINDOW}`;

/**
 * The board's filter, its sub-filter (kanban only) and the Done window, as one
 * query.
 *
 * `filter = <id>` referenced by id rather than by its JQL text, which would
 * cost another round trip to fetch. No `ORDER BY` either: the issue endpoint
 * already returns board rank order by default.
 *
 * Every clause is parenthesised — filters routinely contain a top-level `OR`,
 * which would otherwise swallow everything AND-ed after it.
 */
export const boardJql = (filterId: string, subQuery?: string) => {
  return [`filter = ${filterId}`, subQuery, RECENTLY_DONE]
    .filter((clause) => clause && clause.length > 0)
    .map((clause) => `(${clause})`)
    .join(" AND ");
};
