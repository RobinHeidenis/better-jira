import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCheckboxBlankLine,
  RiCheckboxFill,
  RiCheckboxIndeterminateFill,
  RiMoreFill,
} from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { createContext, use, useState } from "react";
import { setChecklistItemStatus } from "#/lib/api/checklist";
import { issueOptions } from "#/lib/api/issues";
import {
  type Checklist as ChecklistData,
  type ChecklistGroup,
  type ChecklistItem,
  checklistText,
  withItemStatus,
} from "#/lib/checklist";
import { Button } from "./ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { SharedTooltipTrigger } from "./ui/tooltip";

export const ChecklistProgress = ({
  done,
  partial,
  total,
}: {
  done: number;
  partial: number;
  total: number;
}) => {
  const percent = (count: number) => `${total ? (count / total) * 100 : 0}%`;
  return (
    <div className="flex h-1 w-full bg-muted">
      <div
        className="h-full bg-emerald-500 transition-[width]"
        style={{ width: percent(done) }}
      />
      <div
        className="h-full bg-sky-500 transition-[width]"
        style={{ width: percent(partial) }}
      />
    </div>
  );
};

const ItemIcon = ({ state }: { state: ChecklistItem["state"] }) => {
  const className = "size-4";
  switch (state) {
    case "done":
      return <RiCheckboxFill className={cn(className, "text-emerald-500")} />;
    case "partial":
      return (
        <RiCheckboxIndeterminateFill
          className={cn(className, "text-sky-500")}
        />
      );
    default:
      return (
        <RiCheckboxBlankLine
          className={cn(className, "text-muted-foreground")}
        />
      );
  }
};

type Editing = {
  /** Every status this checklist uses, open and done first. */
  statuses: string[];
  setStatus: (item: ChecklistItem, status: string) => void;
};

/** Absent when the checklist is read-only. */
const EditingContext = createContext<Editing | null>(null);

const Item = ({ item }: { item: ChecklistItem }) => {
  const editing = use(EditingContext);
  const next = item.state === "done" ? "open" : "done";

  return (
    <li className="group/item flex items-start gap-2 py-1">
      {/* The status is only spelled out on hover; the icon carries it. */}
      <SharedTooltipTrigger
        content={item.status}
        aria-label={editing ? `${item.status}, mark ${next}` : item.status}
        className={cn(
          "mt-0.5 flex shrink-0",
          editing && "cursor-pointer hover:opacity-80",
        )}
        render={
          editing ? (
            <button
              type="button"
              onClick={() => editing.setStatus(item, next)}
            />
          ) : (
            <span />
          )
        }
      >
        <ItemIcon state={item.state} />
      </SharedTooltipTrigger>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            item.state === "done" || item.state === "skipped"
              ? "text-muted-foreground line-through"
              : "text-foreground",
          )}
        >
          {item.text}
        </p>
        {item.note ? (
          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
            {item.note}
          </p>
        ) : null}
      </div>
      {editing && editing.statuses.length > 2 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Status of "${item.text}"`}
                className="shrink-0 text-muted-foreground opacity-0 group-hover/item:opacity-100 hover:text-foreground focus-visible:opacity-100 data-popup-open:text-foreground data-popup-open:opacity-100"
              />
            }
          >
            <RiMoreFill />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuRadioGroup
              value={item.status}
              onValueChange={(status: string) =>
                editing.setStatus(item, status)
              }
            >
              {editing.statuses.map((status) => (
                <DropdownMenuRadioItem key={status} value={status}>
                  {status}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  );
};

const Group = ({ group }: { group: ChecklistGroup }) => {
  const [open, setOpen] = useState(true);
  const done = group.items.filter((item) => item.state === "done").length;
  const partial = group.items.filter((item) => item.state === "partial").length;
  const total = group.items.filter((item) => item.state !== "skipped").length;

  if (!group.title) {
    return (
      <ul>
        {group.items.map((item) => (
          <Item key={item.id} item={item} />
        ))}
      </ul>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-1 py-1 text-left font-semibold text-muted-foreground hover:text-foreground">
        {open ? (
          <RiArrowDownSLine className="size-4 shrink-0" />
        ) : (
          <RiArrowRightSLine className="size-4 shrink-0" />
        )}
        <span className="flex-1">{group.title}</span>
        <span className="font-normal tabular-nums">
          {partial ? <span className="text-sky-500">+{partial} </span> : null}
          {done}/{total}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {group.items.length ? (
          <ul className="pl-5">
            {group.items.map((item) => (
              <Item key={item.id} item={item} />
            ))}
          </ul>
        ) : (
          <p className="py-1 pl-5 text-muted-foreground">No items</p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

const statusesOf = (checklist: ChecklistData) => {
  const seen = checklist.groups.flatMap((group) =>
    group.items.map((item) => item.status),
  );
  return [...new Set(["open", "done", ...seen])].filter(
    (status) => status !== "",
  );
};

/**
 * Updates the cached issue straight away and writes to Jira in the
 * background. Changes go out one at a time, so quick clicks can't race, and
 * the issue is reloaded once the last one is through.
 */
const useSetItemStatus = ({
  issueId,
  issueKey,
  fieldId,
  checklist,
}: {
  issueId: string;
  issueKey: string;
  fieldId: string;
  checklist: ChecklistData;
}) => {
  const queryClient = useQueryClient();
  const { queryKey } = issueOptions(issueId);
  const mutationKey = ["checklist", issueKey];
  const mutation = useMutation({
    mutationKey,
    scope: { id: `checklist:${issueKey}` },
    mutationFn: setChecklistItemStatus,
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey }) <= 1) {
        return queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  const setStatus = (item: ChecklistItem, status: string) => {
    if (item.status === status) return;
    void queryClient.cancelQueries({ queryKey, exact: true });
    queryClient.setQueryData(queryKey, (issue) => {
      const text = issue && checklistText(issue.fields[fieldId]);
      const result = text && withItemStatus(text, checklist, item, status);
      return issue && result
        ? { ...issue, fields: { ...issue.fields, [fieldId]: result.text } }
        : issue;
    });
    mutation.mutate({ issueKey, fieldId, checklist, item, status });
  };

  return { setStatus, error: mutation.error, reset: mutation.reset };
};

export const Checklist = ({
  checklist,
  issueId,
  issueKey,
  fieldId,
}: {
  checklist: ChecklistData;
  /** The id or key the issue was loaded by, which keys its query. */
  issueId: string;
  issueKey: string;
  fieldId: string;
}) => {
  const { setStatus, error, reset } = useSetItemStatus({
    issueId,
    issueKey,
    fieldId,
    checklist,
  });
  const partial = Object.entries(checklist.partial);
  const partialTotal = partial.reduce((sum, [, count]) => sum + count, 0);
  return (
    <EditingContext value={{ statuses: statusesOf(checklist), setStatus }}>
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between gap-4 font-semibold">
            <span>{checklist.title ?? "Checklist"}</span>
            <span className="tabular-nums">
              {checklist.done}/{checklist.total}
              {partial.map(([status, count]) => (
                <span key={status} className="font-normal text-sky-500">
                  {" "}
                  · {count} {status}
                </span>
              ))}
            </span>
          </div>
          <ChecklistProgress
            done={checklist.done}
            partial={partialTotal}
            total={checklist.total}
          />
        </div>
        {error ? (
          <p className="flex items-start justify-between gap-2 border border-destructive/40 bg-destructive/5 px-3 py-2 text-destructive">
            <span>Couldn't update the checklist: {error.message}</span>
            <button
              type="button"
              onClick={reset}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              Dismiss
            </button>
          </p>
        ) : null}
        <div className="space-y-1">
          {checklist.groups.map((group) => (
            <Group key={group.id} group={group} />
          ))}
        </div>
      </div>
    </EditingContext>
  );
};
