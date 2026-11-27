import {
  RiArrowDownSLine,
  RiArrowLeftRightLine,
  RiCloseLine,
  RiUserLine,
} from "@remixicon/react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { cn } from "cn";
import { useEffect, useState } from "react";
import { currentUserOptions } from "#/lib/api/current-user";
import { type Transition, transitionsOptions } from "#/lib/api/transitions";
import { boardSelection, clearSelection } from "#/lib/board-search";
import { editIssue } from "#/lib/edit-issue";
import { store } from "#/lib/store";
import { reportError, startBulkTransition } from "#/lib/transition";
import { isPopupOpen } from "#/lib/utils";
import { PeoplePicker, personEdit } from "./people-picker";
import { useStatusTone } from "./related-issues";
import { useLaneOrder } from "./transition-menu";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

const MoveMenu = () => {
  const queryClient = useQueryClient();
  const selected = useSelector(boardSelection, (state) => state.issues);
  const tone = useStatusTone();
  const laneOrder = useLaneOrder();
  const results = useQueries({
    queries: selected.map((issue) => transitionsOptions(issue.key)),
  });
  const loading = results.some((result) => result.isPending);

  // One entry per target status, with each issue's own way of getting there.
  const targets = new Map<
    string,
    { to: Transition["to"]; byKey: Map<string, Transition> }
  >();
  selected.forEach((issue, index) => {
    for (const transition of results[index]?.data ?? []) {
      if (transition.to.id === issue.statusId) continue;
      const target = targets.get(transition.to.id) ?? {
        to: transition.to,
        byKey: new Map(),
      };
      if (!target.byKey.has(issue.key)) target.byKey.set(issue.key, transition);
      targets.set(transition.to.id, target);
    }
  });
  const ordered = [...targets.values()].sort(
    (a, b) => laneOrder(a.to) - laneOrder(b.to),
  );

  const move = (target: (typeof ordered)[number]) => {
    const moves = selected.flatMap((issue) => {
      const transition = target.byKey.get(issue.key);
      return transition ? [{ issue, transition }] : [];
    });
    const stuck = selected.filter((issue) => !target.byKey.has(issue.key));
    if (stuck.length) {
      reportError(
        `Couldn't move ${stuck.map((issue) => issue.key).join(", ")} to ${target.to.name}: Jira offers no way there from their current status.`,
      );
    }
    startBulkTransition(queryClient, moves);
    clearSelection();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm">
            <RiArrowLeftRightLine data-icon="inline-start" />
            Move
            <RiArrowDownSLine data-icon="inline-end" />
          </Button>
        }
      />
      <DropdownMenuContent side="top" align="start" className="w-64">
        <DropdownMenuGroup>
          {loading ? (
            <DropdownMenuLabel>Loading…</DropdownMenuLabel>
          ) : !ordered.length ? (
            <DropdownMenuLabel>No status fits these tickets</DropdownMenuLabel>
          ) : (
            ordered.map((target) => (
              <DropdownMenuItem
                key={target.to.id}
                onClick={() => move(target)}
                className="items-start"
              >
                <span
                  className={cn(
                    "mt-1 size-2 shrink-0 rounded-full",
                    tone(target.to),
                  )}
                />
                <span className="flex-1">{target.to.name}</span>
                {target.byKey.size < selected.length ? (
                  <span className="text-muted-foreground tabular-nums">
                    {target.byKey.size} of {selected.length}
                  </span>
                ) : null}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const PeopleButton = ({
  kind,
  fieldId,
}: {
  kind: "assignee" | "developer";
  fieldId: string;
}) => {
  const queryClient = useQueryClient();
  const selected = useSelector(boardSelection, (state) => state.issues);
  const [open, setOpen] = useState(false);
  const label = kind === "developer" ? "Developer" : "Assignee";
  const first = selected[0];
  if (!first) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm">
            <RiUserLine data-icon="inline-start" />
            {label}
          </Button>
        }
      />
      <PopoverContent side="top" align="start" className="w-64 p-2">
        {open ? (
          <PeoplePicker
            // People who can be assigned on one ticket are the project's, so
            // any of the selected tickets serves.
            issueKey={first.key}
            value={undefined}
            placeholder={`Set the ${label.toLowerCase()}`}
            autoOpen
            onOpenChange={(next) => !next && setOpen(false)}
            onChange={async (value) => {
              setOpen(false);
              if (!value) return;
              const me =
                value.kind === "me"
                  ? await queryClient.ensureQueryData(currentUserOptions())
                  : undefined;
              const edit = personEdit(value, me);
              if (!edit) return;
              for (const issue of selected) {
                void editIssue(
                  queryClient,
                  issue.key,
                  { fields: { [fieldId]: edit.payload } },
                  { [fieldId]: edit.display },
                );
              }
              clearSelection();
            }}
          />
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

/** The bar for acting on every selected card at once. */
export const BulkActions = () => {
  const count = useSelector(boardSelection, (state) => state.issues.length);
  const developerField = useSelector(store, (state) => state.developerField);
  // Loaded up front so "Me" resolves without a wait.
  useQuery({ ...currentUserOptions(), enabled: count > 0 });

  useEffect(() => {
    if (!count) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (isPopupOpen()) return;
      clearSelection();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [count]);

  if (!count) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 border bg-popover px-3 py-2 text-popover-foreground shadow-lg">
      <span className="pr-1 tabular-nums">{count} selected</span>
      <MoveMenu />
      <PeopleButton kind="assignee" fieldId="assignee" />
      {developerField ? (
        <PeopleButton kind="developer" fieldId={developerField} />
      ) : null}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Clear the selection (Esc)"
        title="Clear the selection (Esc)"
        onClick={clearSelection}
      >
        <RiCloseLine />
      </Button>
    </div>
  );
};
