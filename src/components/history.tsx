import { RiArrowRightLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { useState } from "react";
import {
  type Change,
  type ChangeItem,
  changelogOptions,
  isAppChange,
} from "#/lib/api/changelog";
import { checklistChanges } from "#/lib/checklist";
import { store } from "#/lib/store";
import { initials, timeAgo } from "#/lib/utils";
import { ErrorState } from "./error-state";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Spinner } from "./ui/spinner";
import { Switch } from "./ui/switch";

const dateTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const MAX_CHECKLIST_LINES = 6;

/** Values too long to show inline, like the description. */
const isLong = (value?: string | null) =>
  !!value && (value.length > 120 || value.includes("\n"));

const Value = ({ children }: { children: string }) => (
  <span className="bg-muted px-1 break-words">{children}</span>
);

const ChecklistItemChange = ({
  item,
  checklistField,
}: {
  item: ChangeItem;
  checklistField: string;
}) => {
  const changes = checklistChanges(
    item.fromString ?? null,
    item.toString ?? null,
  );
  if (!changes.length) {
    return <li className="text-muted-foreground">Rewrote the checklist</li>;
  }
  const rest = changes.length - MAX_CHECKLIST_LINES;
  return (
    <>
      {changes.slice(0, MAX_CHECKLIST_LINES).map((change) => (
        <li key={`${checklistField}:${change.text}`}>
          <span className="text-muted-foreground">Checklist: </span>
          {change.text}{" "}
          <span className="text-muted-foreground">
            {change.from === null
              ? "(added)"
              : change.to === null
                ? "(removed)"
                : `${change.from} → ${change.to}`}
          </span>
        </li>
      ))}
      {rest > 0 ? (
        <li className="text-muted-foreground">
          and {rest} more checklist {rest === 1 ? "item" : "items"}
        </li>
      ) : null}
    </>
  );
};

const ItemChange = ({ item }: { item: ChangeItem }) => {
  const field = item.field.charAt(0).toUpperCase() + item.field.slice(1);
  const from = item.fromString?.trim() || null;
  const to = item.toString?.trim() || null;

  if (item.field === "Comment" && !to) {
    return <li className="text-muted-foreground">Deleted a comment</li>;
  }
  if (item.fieldId === "labels") {
    const before = new Set(from?.split(/\s+/) ?? []);
    const after = new Set(to?.split(/\s+/) ?? []);
    const added = [...after].filter((label) => !before.has(label));
    const removed = [...before].filter((label) => !after.has(label));
    return (
      <li className="flex flex-wrap items-center gap-1">
        <span className="text-muted-foreground">Labels:</span>
        {added.map((label) => (
          <Value key={`+${label}`}>{`+ ${label}`}</Value>
        ))}
        {removed.map((label) => (
          <span
            key={`-${label}`}
            className="text-muted-foreground line-through"
          >
            {label}
          </span>
        ))}
      </li>
    );
  }
  if (isLong(from) || isLong(to)) {
    return (
      <li>
        <span className="text-muted-foreground">Updated </span>
        {field}
      </li>
    );
  }
  return (
    <li className="flex flex-wrap items-center gap-1">
      <span className="text-muted-foreground">{field}:</span>
      {from ? (
        <span className="text-muted-foreground line-through">{from}</span>
      ) : null}
      {from && to ? (
        <RiArrowRightLine className="size-3 text-muted-foreground" />
      ) : null}
      {to ? (
        <Value>{to}</Value>
      ) : (
        <span className="text-muted-foreground">cleared</span>
      )}
    </li>
  );
};

const ChangeEntry = ({
  change,
  checklistField,
}: {
  change: Change;
  checklistField: string | null;
}) => {
  const name = change.author?.displayName ?? "Jira";
  return (
    <li className="flex gap-3 py-3">
      <Avatar size="sm" rounded={false} className="mt-0.5">
        <AvatarImage
          src={change.author?.avatarUrls?.["48x48"] ?? undefined}
          alt=""
        />
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-medium">{name}</span>
          <time
            dateTime={change.created}
            title={dateTime.format(new Date(change.created))}
            className="text-muted-foreground"
          >
            {timeAgo(change.created)}
          </time>
        </div>
        <ul className="space-y-0.5">
          {change.items.map((item, index) =>
            checklistField && item.fieldId === checklistField ? (
              <ChecklistItemChange
                // biome-ignore lint/suspicious/noArrayIndexKey: a change's items have no id and never reorder
                key={index}
                item={item}
                checklistField={checklistField}
              />
            ) : (
              // biome-ignore lint/suspicious/noArrayIndexKey: a change's items have no id and never reorder
              <ItemChange key={index} item={item} />
            ),
          )}
        </ul>
      </div>
    </li>
  );
};

// One person's edits this close together read as a single change.
const MERGE_WINDOW = 5 * 60 * 1000;

/**
 * Folds an older change's items into a newer one's, keeping one item per
 * field that runs from its oldest value to its newest. A field that ended
 * where it started is dropped.
 */
const netItems = (newer: ChangeItem[], older: ChangeItem[]) => {
  const key = (item: ChangeItem) => item.fieldId ?? item.field;
  const result = [...newer];
  for (const item of older) {
    const index = result.findIndex((other) => key(other) === key(item));
    const existing = result[index];
    if (existing) {
      result[index] = { ...existing, fromString: item.fromString };
    } else {
      result.push(item);
    }
  }
  return result.filter(
    (item) => (item.fromString ?? "") !== (item.toString ?? ""),
  );
};

const merge = (changes: Change[]) => {
  const merged: Change[] = [];
  for (const change of changes) {
    const last = merged.at(-1);
    if (
      last &&
      last.author?.accountId === change.author?.accountId &&
      Date.parse(last.created) - Date.parse(change.created) <= MERGE_WINDOW
    ) {
      merged[merged.length - 1] = {
        ...last,
        items: netItems(last.items, change.items),
      };
    } else {
      merged.push(change);
    }
  }
  return merged.filter((change) => change.items.length > 0);
};

export const History = ({ issueKey }: { issueKey: string }) => {
  const checklistField = useSelector(store, (state) => state.checklistField);
  const [showApps, setShowApps] = useState(false);
  const { data, error, isPending } = useQuery(changelogOptions(issueKey));

  if (isPending) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }
  if (error) {
    return <ErrorState title="Couldn't load the history" error={error} />;
  }

  const apps = data.filter(isAppChange).length;
  const changes = merge(
    showApps ? data : data.filter((change) => !isAppChange(change)),
  );

  return (
    <div>
      {apps ? (
        // biome-ignore lint/a11y/noLabelWithoutControl: the Switch renders the control
        <label className="flex items-center justify-end gap-2 py-2 text-muted-foreground">
          Show {apps} {apps === 1 ? "change" : "changes"} by apps
          <Switch size="sm" checked={showApps} onCheckedChange={setShowApps} />
        </label>
      ) : null}
      {changes.length ? (
        <ul className="divide-y">
          {changes.map((change) => (
            <ChangeEntry
              key={change.id}
              change={change}
              checklistField={checklistField}
            />
          ))}
        </ul>
      ) : (
        <p className="py-4 text-muted-foreground">No changes yet</p>
      )}
    </div>
  );
};
