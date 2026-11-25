import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCheckboxBlankLine,
  RiCheckboxFill,
} from "@remixicon/react";
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
  total,
}: {
  done: number;
  total: number;
}) => (
  <div className="h-1 w-full bg-muted">
    <div
      className="h-full bg-emerald-500 transition-[width]"
      style={{ width: `${total ? (done / total) * 100 : 0}%` }}
    />
  </div>
);

const Item = ({ item }: { item: ChecklistItem }) => (
  <li className="flex items-start gap-2 py-1">
    {item.done ? (
      <RiCheckboxFill className="mt-0.5 size-4 shrink-0 text-emerald-500" />
    ) : (
      <RiCheckboxBlankLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
    )}
    <div className="min-w-0 flex-1">
      <p
        className={
          item.done ? "text-muted-foreground line-through" : "text-foreground"
        }
      >
        {item.status !== "open" && !item.done ? (
          <Badge variant="outline" className="mr-2 align-middle">
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
  const done = group.items.filter((item) => item.done).length;

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
          {done}/{group.items.length}
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

export const Checklist = ({ checklist }: { checklist: ChecklistData }) => (
  <div className="space-y-3">
    <div className="space-y-2">
      <div className="flex justify-between font-semibold">
        <span>{checklist.title ?? "Checklist"}</span>
        <span className="tabular-nums">
          {checklist.done}/{checklist.total}
        </span>
      </div>
      <ChecklistProgress done={checklist.done} total={checklist.total} />
    </div>
    <div className="space-y-1">
      {checklist.groups.map((group) => (
        <Group key={group.id} group={group} />
      ))}
    </div>
  </div>
);
