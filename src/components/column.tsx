import { useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "cn";
import { type RefObject, useEffect, useRef, useState } from "react";
import { transitionsOptions } from "#/lib/api/transitions";
import {
  boardDrag,
  boardScroll,
  boardSearch,
  boardSelection,
  clearSelection,
  selectCard,
} from "#/lib/board-search";
import {
  reportError,
  startBulkTransition,
  startTransition,
} from "#/lib/transition";
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
  const selectedIds = new Set(
    useSelector(boardSelection, (state) => state.issues).map(
      (issue) => issue.id,
    ),
  );
  const columnRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const dragged = useSelector(boardDrag, (state) => state);
  const [dropping, setDropping] = useState(false);
  const selection = useSelector(boardSelection, (state) => state.issues);
  // Dragging one of several selected cards takes them all along.
  const draggingSelection =
    !!dragged &&
    selection.length > 1 &&
    selection.some((selected) => selected.id === dragged.id);
  const canDrop = draggingSelection
    ? selection.some((selected) => !statusIds.includes(selected.statusId))
    : !!dragged && dragged.column !== name;

  const drop = async () => {
    const issue = boardDrag.state;
    boardDrag.setState(() => null);
    if (!issue) return;
    const group = draggingSelection
      ? boardSelection.state.issues.filter(
          (selected) => !statusIds.includes(selected.statusId),
        )
      : issue.column === name
        ? []
        : [issue];
    if (!group.length) return;

    const found = await Promise.all(
      group.map(async (target) => {
        try {
          const transitions = await queryClient.fetchQuery(
            transitionsOptions(target.key),
          );
          // A column can hold several statuses; its first one wins.
          const transition = statusIds
            .map((id) => transitions.find((other) => other.to.id === id))
            .find((other) => other !== undefined);
          if (!transition) {
            reportError(
              `${target.key} can't move to ${name} from its current status.`,
            );
            return null;
          }
          return { issue: target, transition };
        } catch (error) {
          reportError(
            `Couldn't move ${target.key}: ${error instanceof Error ? error.message : String(error)}`,
          );
          return null;
        }
      }),
    );
    const moves = found.filter((move) => move !== null);
    if (draggingSelection) {
      clearSelection();
      startBulkTransition(queryClient, moves);
    } else if (moves[0]) {
      startTransition(queryClient, moves[0].issue, moves[0].transition);
    }
  };

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
    initialOffset: () => boardScroll.top,
    initialMeasurementsCache: boardScroll.measurements.get(name),
  });

  useEffect(
    () => () => {
      boardScroll.measurements.set(name, virtualizer.measurementsCache);
    },
    [name, virtualizer],
  );

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
    // biome-ignore lint/a11y/noStaticElementInteractions: dropping is a mouse shortcut for the status menu, which the keyboard reaches with s
    <div
      ref={columnRef}
      className={cn(
        "w-80 shrink-0 bg-card/30 p-4 outline-offset-[-2px] transition-colors",
        canDrop &&
          dropping &&
          "bg-primary/5 outline-2 outline-primary/40 outline-dashed",
      )}
      onDragOver={(event) => {
        if (!canDrop) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (!dropping) setDropping(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDropping(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDropping(false);
        void drop();
      }}
    >
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
              // biome-ignore lint/a11y/noStaticElementInteractions: dragging is a mouse shortcut for the status menu, which the keyboard reaches with s
              <div
                key={row.key}
                data-index={row.index}
                ref={virtualizer.measureElement}
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", issue.key);
                  // Dragging from the title would otherwise show just the link.
                  event.dataTransfer.setDragImage(
                    event.currentTarget,
                    event.nativeEvent.offsetX,
                    event.nativeEvent.offsetY,
                  );
                  boardDrag.setState(() => ({
                    id: issue.id,
                    key: issue.key,
                    summary: issue.fields.summary,
                    column: name,
                  }));
                  void queryClient.prefetchQuery(transitionsOptions(issue.key));
                }}
                onClickCapture={(event) => {
                  if (!(event.metaKey || event.ctrlKey || event.shiftKey)) {
                    return;
                  }
                  // Popovers are portalled but React still bubbles their
                  // clicks here; leave Cmd-click on their links alone.
                  if (!event.currentTarget.contains(event.target as Node)) {
                    return;
                  }
                  // A modified click selects instead of opening the ticket.
                  event.preventDefault();
                  event.stopPropagation();
                  selectCard(issue, issues, event.shiftKey);
                }}
                onDragEnd={() => {
                  // Cleared on drop already; this covers a cancelled drag.
                  if (boardDrag.state) boardDrag.setState(() => null);
                }}
                className={cn(
                  "absolute top-0 left-0 w-full",
                  issue.id === activeIssueId &&
                    "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  (dragged?.id === issue.id ||
                    (draggingSelection && selectedIds.has(issue.id))) &&
                    "opacity-50",
                  selectedIds.has(issue.id) &&
                    "ring-2 ring-sky-500 ring-offset-2 ring-offset-background",
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
