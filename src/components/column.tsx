import { useSelector } from "@tanstack/react-store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "cn";
import { type RefObject, useEffect, useRef, useState } from "react";
import { boardSearch } from "#/lib/board-search";
import { IssueCard } from "./issue-card";
import { CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import { useBoardIssues } from "./use-board-issues";

export const Column = ({
  boardId,
  name,
  statusIds,
  jql,
  scrollRef,
}: {
  boardId: number;
  name: string;
  statusIds: string[];
  jql: string;
  /** The board's scroller, which every column shares for vertical scrolling. */
  scrollRef: RefObject<HTMLDivElement | null>;
}) => {
  // The virtualizer hands back the same instance on every render and mutates
  // it, which the React Compiler's memoisation would freeze.
  "use no memo";
  const { isPending, columnIssues, developerField, storyPointsField } =
    useBoardIssues(boardId, jql);
  const { issues, total } = columnIssues(name, statusIds);
  const activeIssueId = useSelector(
    boardSearch,
    (state) => state.activeIssueId,
  );
  const columnRef = useRef<HTMLDivElement>(null);

  const [listOffset, setListOffset] = useState(0);
  // The scroller is the nearest positioned ancestor, so `offsetTop` is the
  // list's distance from the top of the scrolled content.
  const measureList = (node: HTMLDivElement | null) => {
    if (node && node.offsetTop !== listOffset) setListOffset(node.offsetTop);
  };

  const virtualizer = useVirtualizer({
    count: isPending ? 0 : issues.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 160,
    gap: 16,
    overscan: 4,
    scrollMargin: listOffset,
    getItemKey: (index) => issues[index]?.id ?? index,
  });

  const activeIndex = issues.findIndex((issue) => issue.id === activeIssueId);

  useEffect(() => {
    if (activeIndex === -1) return;
    virtualizer.scrollToIndex(activeIndex, { align: "center" });

    const scroller = scrollRef.current;
    const column = columnRef.current;
    if (!scroller || !column) return;
    const left = column.offsetLeft;
    const right = left + column.offsetWidth;
    if (left < scroller.scrollLeft) {
      scroller.scrollTo({ left, behavior: "smooth" });
    } else if (right > scroller.scrollLeft + scroller.clientWidth) {
      scroller.scrollTo({
        left: right - scroller.clientWidth,
        behavior: "smooth",
      });
    }
  }, [activeIndex, virtualizer, scrollRef]);

  return (
    <div ref={columnRef} className="w-80 shrink-0 bg-card/30 p-4">
      <CardTitle>
        {name}
        {!isPending &&
          ` (${issues.length !== total ? `${issues.length} / ` : ""}${total})`}
      </CardTitle>
      <Separator className="my-4" />
      {isPending ? (
        <div className="space-y-4">
          {/* A fixed few, since the real count isn't known until the first
              page of issues arrives. */}
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div
          ref={measureList}
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((row) => {
            const issue = issues[row.index];
            if (!issue) return null;
            return (
              <div
                key={row.key}
                data-index={row.index}
                ref={virtualizer.measureElement}
                className={cn(
                  "absolute top-0 left-0 w-full",
                  issue.id === activeIssueId &&
                    "ring-2 ring-primary ring-offset-2 ring-offset-background",
                )}
                style={{
                  transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)`,
                }}
              >
                <IssueCard
                  issue={issue}
                  developerField={developerField}
                  storyPointsField={storyPointsField}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
