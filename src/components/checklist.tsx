import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCheckboxBlankLine,
  RiCheckboxFill,
  RiCheckboxIndeterminateFill,
} from "@remixicon/react";
import { cn } from "cn";
import { useState } from "react";
import type {
  Checklist as ChecklistData,
  ChecklistGroup,
  ChecklistItem,
} from "#/lib/checklist";
import { Badge } from "./ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

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
  const className = "mt-0.5 size-4 shrink-0";
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

const Item = ({ item }: { item: ChecklistItem }) => (
  <li className="flex items-start gap-2 py-1">
    <ItemIcon state={item.state} />
    <div className="min-w-0 flex-1">
      <p
        className={cn(
          item.state === "done" || item.state === "skipped"
            ? "text-muted-foreground line-through"
            : "text-foreground",
        )}
      >
        {item.state === "partial" || item.state === "skipped" ? (
          <Badge
            variant="outline"
            className={cn(
              "mr-2 align-middle no-underline",
              item.state === "partial" && "border-sky-500/40 text-sky-500",
            )}
          >
            {item.status}
          </Badge>
        ) : null}
        {item.text}
      </p>
      {item.note ? (
        <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
          {item.note}
        </p>
      ) : null}
    </div>
  </li>
);

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

export const Checklist = ({ checklist }: { checklist: ChecklistData }) => {
  const partial = Object.entries(checklist.partial);
  const partialTotal = partial.reduce((sum, [, count]) => sum + count, 0);
  return (
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
      <div className="space-y-1">
        {checklist.groups.map((group) => (
          <Group key={group.id} group={group} />
        ))}
      </div>
    </div>
  );
};
