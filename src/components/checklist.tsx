import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCheckboxBlankLine,
  RiCheckboxFill,
  RiCheckboxIndeterminateFill,
  RiCheckDoubleLine,
  RiMoreFill,
} from "@remixicon/react";
import { useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { cn } from "cn";
import { createContext, use, useState } from "react";
import { issueOptions } from "#/lib/api/issues";
import {
  type Checklist as ChecklistData,
  type ChecklistGroup,
  type ChecklistItem,
  type GroupTarget,
  itemRef,
} from "#/lib/checklist";
import {
  dismissChecklistError,
  queueChecklistAddition,
  queueChecklistChange,
} from "#/lib/checklist-sync";
import { store } from "#/lib/store";
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
  statuses: { value: string; label: string }[];
  setStatus: (item: ChecklistItem, status: string) => void;
  addItem: (group: GroupTarget, text: string) => void;
};

/** Absent when the checklist is read-only. */
const EditingContext = createContext<Editing | null>(null);

const Item = ({ item }: { item: ChecklistItem }) => {
  const editing = use(EditingContext);
  const next = item.state === "done" ? "open" : "done";

  return (
    <li className="group/item flex items-start gap-2 py-1">
      {editing ? (
        <button
          type="button"
          aria-label={`${item.status}, mark ${next}`}
          onClick={() => editing.setStatus(item, next)}
          className="mt-0.5 flex shrink-0 cursor-pointer hover:opacity-80"
        >
          <ItemIcon state={item.state} />
        </button>
      ) : (
        <span
          role="img"
          aria-label={item.status}
          className="mt-0.5 flex shrink-0"
        >
          <ItemIcon state={item.state} />
        </span>
      )}
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
      {editing ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Status of "${item.text}"`}
                className="-my-1 shrink-0 text-muted-foreground opacity-0 group-hover/item:opacity-100 hover:text-foreground focus-visible:opacity-100 data-popup-open:text-foreground data-popup-open:opacity-100"
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
                <DropdownMenuRadioItem key={status.value} value={status.value}>
                  {status.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </li>
  );
};

/** A row that turns into an input; Enter adds the item and stays open. */
const AddItem = ({ group }: { group: GroupTarget }) => {
  const editing = use(EditingContext);
  const [adding, setAdding] = useState(false);
  if (!editing) return null;

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex cursor-pointer items-center gap-2 py-1 text-muted-foreground hover:text-foreground"
      >
        <RiAddLine className="size-4" />
        Add item
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1">
      <RiAddLine className="size-4 shrink-0 text-muted-foreground" />
      <input
        // biome-ignore lint/a11y/noAutofocus: opened on purpose by clicking "Add item"
        autoFocus
        aria-label={
          group.title ? `Add an item to ${group.title}` : "Add an item"
        }
        placeholder="New item, Enter to add"
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        onBlur={(event) => {
          if (!event.currentTarget.value.trim()) setAdding(false);
        }}
        onKeyDown={(event) => {
          const input = event.currentTarget;
          // Enter also confirms a character in an input method.
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Escape") {
            event.preventDefault();
            input.value = "";
            setAdding(false);
          } else if (event.key === "Enter") {
            event.preventDefault();
            // Line breaks would start a new line in the checklist's text.
            const text = input.value.replace(/\s+/g, " ").trim();
            if (text) editing.addItem(group, text);
            input.value = "";
          }
        }}
      />
    </div>
  );
};

const Group = ({ group, index }: { group: ChecklistGroup; index: number }) => {
  const [open, setOpen] = useState(true);
  const done = group.items.filter((item) => item.state === "done").length;
  const partial = group.items.filter((item) => item.state === "partial").length;
  const total = group.items.filter((item) => item.state !== "skipped").length;

  if (!group.title) {
    return (
      <div>
        <ul>
          {group.items.map((item) => (
            <Item key={item.id} item={item} />
          ))}
        </ul>
        <AddItem group={{ index, title: null }} />
      </div>
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
        <div className="pl-5">
          <AddItem group={{ index, title: group.title }} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// Issue Checklist Pro's statuses are configured in the app, which offers no
// API to read them, so they come from settings.
/** The statuses from settings, plus any other one this checklist uses. */
const statusesOf = (checklist: ChecklistData, statuses: string[]) => {
  const known = statuses.map((label) => ({
    value: label.toLowerCase(),
    label,
  }));
  const extra = checklist.groups
    .flatMap((group) => group.items.map((item) => item.status))
    .filter(
      (status) => status && !known.some((option) => option.value === status),
    );
  return [
    ...known,
    ...[...new Set(extra)].map((status) => ({ value: status, label: status })),
  ];
};

export const Checklist = ({
  checklist,
  issueId,
  issueKey,
  text,
  fieldId,
  error,
}: {
  /** With changes not yet confirmed in Jira already applied. */
  checklist: ChecklistData;
  /** The checklist's text the above was parsed from. */
  text: string;
  /** The id or key the issue was loaded by, which keys its query. */
  issueId: string;
  issueKey: string;
  fieldId: string;
  error: string | null;
}) => {
  const queryClient = useQueryClient();
  const statuses = useSelector(store, (state) => state.checklistStatuses);
  const reload = () =>
    queryClient.invalidateQueries({
      queryKey: issueOptions(issueId).queryKey,
    });
  const addItem = (group: GroupTarget, itemText: string) =>
    queueChecklistAddition(issueKey, fieldId, reload, {
      text: itemText,
      group,
      currentText: text,
    });
  const setStatus = (item: ChecklistItem, status: string) => {
    if (item.status === status) return;
    queueChecklistChange(
      issueKey,
      fieldId,
      () =>
        queryClient.invalidateQueries({
          queryKey: issueOptions(issueId).queryKey,
        }),
      { ref: itemRef(checklist, item), current: item.status, status },
    );
  };
  // Skipped items stay skipped; they don't count towards the total anyway.
  const remaining = checklist.groups.flatMap((group) =>
    group.items.filter(
      (item) => item.state !== "done" && item.state !== "skipped",
    ),
  );
  const partial = Object.entries(checklist.partial);
  const partialTotal = partial.reduce((sum, [, count]) => sum + count, 0);
  return (
    <EditingContext
      value={{ statuses: statusesOf(checklist, statuses), setStatus, addItem }}
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-4 font-semibold">
            <span className="flex-1">{checklist.title ?? "Checklist"}</span>
            {remaining.length ? (
              <Button
                variant="outline"
                size="xs"
                className="-my-1 font-normal"
                onClick={() => {
                  for (const item of remaining) setStatus(item, "done");
                }}
              >
                <RiCheckDoubleLine />
                Check all
              </Button>
            ) : null}
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
            <span>Couldn't update the checklist: {error}</span>
            <button
              type="button"
              onClick={() => dismissChecklistError(issueKey)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              Dismiss
            </button>
          </p>
        ) : null}
        <div className="space-y-1">
          {checklist.groups.map((group, index) => (
            // Line numbers shift as items are added above, so they'd remount
            // the group and reset it.
            // biome-ignore lint/suspicious/noArrayIndexKey: groups keep their order, and titles can repeat
            <Group key={index} group={group} index={index} />
          ))}
        </div>
      </div>
    </EditingContext>
  );
};
