import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { cn } from "cn";
import type { ReactElement } from "react";
import { boardConfigurationOptions } from "#/lib/api/boards";
import { type Transition, transitionsOptions } from "#/lib/api/transitions";
import { store } from "#/lib/store";
import { startTransition, type TransitionTarget } from "#/lib/transition";
import { useStatusTone } from "./related-issues";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

/**
 * Orders statuses the way the board shows them, left to right. Statuses the
 * board has no column for go before it when they're still "To Do" (like
 * refinement), and after it otherwise (like "Won't fix").
 */
export const useLaneOrder = () => {
  const boardId = useSelector(store, (state) => state.boardId);
  // Hidden columns still have a place in the workflow's order.
  const { data: board } = useQuery(boardConfigurationOptions(boardId, true));
  const positions = new Map<string, number>();
  for (const column of board?.columnConfig.columns ?? []) {
    for (const status of column.statuses) {
      if (!positions.has(status.id)) positions.set(status.id, positions.size);
    }
  }
  return (status: Transition["to"]) => {
    const position = positions.get(status.id);
    if (position !== undefined) return position;
    switch (status.statusCategory?.name) {
      case "To Do":
        return -1;
      case "Done":
        return 2000;
      default:
        return 1000;
    }
  };
};

const TransitionItems = ({
  issue,
  statusId,
}: {
  issue: TransitionTarget;
  statusId: string;
}) => {
  const queryClient = useQueryClient();
  const tone = useStatusTone();
  const laneOrder = useLaneOrder();
  const { data, isPending, error } = useQuery(transitionsOptions(issue.key));

  if (isPending) {
    return <DropdownMenuLabel>Loading…</DropdownMenuLabel>;
  }
  if (error) {
    return (
      <DropdownMenuLabel className="text-destructive">
        {error.message}
      </DropdownMenuLabel>
    );
  }

  const transitions = data
    .filter((transition) => transition.to.id !== statusId)
    .map((transition, index) => ({ transition, index }))
    .sort(
      (a, b) =>
        laneOrder(a.transition.to) - laneOrder(b.transition.to) ||
        a.index - b.index,
    )
    .map(({ transition }) => transition);
  if (!transitions.length) {
    return <DropdownMenuLabel>No other statuses</DropdownMenuLabel>;
  }

  return transitions.map((transition) => (
    <DropdownMenuItem
      key={transition.id}
      onClick={() => startTransition(queryClient, issue, transition)}
      className="items-start"
    >
      <span
        className={cn("mt-1 size-2 shrink-0 rounded-full", tone(transition.to))}
      />
      <span className="flex min-w-0 flex-col">
        <span className="truncate">{transition.to.name}</span>
        {transition.name !== transition.to.name ? (
          <span className="truncate text-muted-foreground">
            {transition.name}
          </span>
        ) : null}
      </span>
    </DropdownMenuItem>
  ));
};

/** A menu of the statuses the issue can move to. */
export const TransitionMenu = ({
  issue,
  statusId,
  trigger,
  open,
  onOpenChange,
  align = "start",
}: {
  issue: TransitionTarget;
  statusId: string;
  trigger: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: "start" | "end";
}) => {
  const queryClient = useQueryClient();
  const prefetch = () =>
    void queryClient.prefetchQuery(transitionsOptions(issue.key));

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={trigger}
        onPointerEnter={prefetch}
        onFocus={prefetch}
      />
      <DropdownMenuContent align={align} className="w-64">
        <DropdownMenuGroup>
          <TransitionItems issue={issue} statusId={statusId} />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
