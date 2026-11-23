import type z from "zod";
import type {
  TableCellNode as TableCellNodeType,
  TableRowNode,
  tableNode,
} from "#/lib/adf/block-nodes";
import { positiveInt, safeColor } from "#/lib/adf/sanitize";
import { cn } from "#/lib/utils";
import { BlockNode } from "./block-node";

const NUMBER_COLUMN_WIDTH = 42;

const columnWidths = (row: TableRowNode | undefined) =>
  (row?.content ?? []).flatMap((cell) => {
    const span = positiveInt(cell?.attrs?.colspan) ?? 1;
    const widths = Array.isArray(cell?.attrs?.colwidth)
      ? cell.attrs.colwidth
      : [];
    return Array.from({ length: span }, (_, index) => {
      const width = widths[index];
      return typeof width === "number" && width > 0 ? width : undefined;
    });
  });

const isHeaderRow = (row: TableRowNode) =>
  !!row.content?.length &&
  row.content.every((cell) => cell?.type === "tableHeader");

const TableCell = ({ cell }: { cell: TableCellNodeType }) => {
  const Tag = cell.type === "tableHeader" ? "th" : "td";
  const background = safeColor(cell.attrs?.background);
  return (
    <Tag
      colSpan={positiveInt(cell.attrs?.colspan)}
      rowSpan={positiveInt(cell.attrs?.rowspan)}
      style={background ? { backgroundColor: background } : undefined}
      className={cn(
        "border px-2 py-1 text-left align-top",
        Tag === "th" && "bg-muted font-semibold",
        background && "text-neutral-900",
      )}
    >
      {cell.content?.map((child, index) =>
        child ? <BlockNode key={index} node={child} /> : null,
      )}
    </Tag>
  );
};

export const TableNode = ({ node }: { node: z.infer<typeof tableNode> }) => {
  const rows = (node.content ?? []).filter(
    (row): row is TableRowNode => row?.type === "tableRow",
  );
  const numbered = node.attrs?.isNumberColumnEnabled === true;
  const widths = columnWidths(rows[0]);
  const fixed = widths.length > 0 && widths.every((width) => width);
  const totalWidth =
    widths.reduce<number>((sum, width) => sum + (width ?? 0), 0) +
    (numbered ? NUMBER_COLUMN_WIDTH : 0);

  const rowNumbers: (number | null)[] = [];
  let count = 0;
  for (const row of rows) {
    if (isHeaderRow(row)) {
      rowNumbers.push(null);
    } else {
      count += 1;
      rowNumbers.push(count);
    }
  }

  return (
    <div className="my-2 w-full overflow-x-auto">
      <table
        className="min-w-full border-collapse border text-sm"
        style={fixed ? { width: totalWidth, tableLayout: "fixed" } : undefined}
      >
        {fixed ? (
          <colgroup>
            {numbered ? <col style={{ width: NUMBER_COLUMN_WIDTH }} /> : null}
            {widths.map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
        ) : null}
        <tbody>
          {rows.map((row, rowIndex) => {
            const rowNumber = rowNumbers[rowIndex];
            return (
              <tr key={rowIndex}>
                {numbered ? (
                  rowNumber == null ? (
                    <th className="border bg-muted" />
                  ) : (
                    <td className="border bg-muted px-2 py-1 text-center align-top text-muted-foreground">
                      {rowNumber}
                    </td>
                  )
                ) : null}
                {row.content?.map((cell, cellIndex) =>
                  cell ? <TableCell key={cellIndex} cell={cell} /> : null,
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
