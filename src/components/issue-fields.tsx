import { RiCloseLine, RiPencilLine } from "@remixicon/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { type ReactNode, useState } from "react";
import { currentUserOptions } from "#/lib/api/current-user";
import { labelsOptions, prioritiesOptions } from "#/lib/api/edit";
import { componentsOptions } from "#/lib/api/project-components";
import { versionOptions } from "#/lib/api/versions";
import { editIssue } from "#/lib/edit-issue";
import { PeoplePicker, personEdit } from "./people-picker";
import { Picker } from "./settings/field-picker";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

/** Shows a value that turns into its editor on click. */
const EditButton = ({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    aria-label={`Edit ${label}`}
    onClick={onClick}
    className="group/edit -mx-1.5 flex w-[calc(100%+0.75rem)] min-w-0 cursor-pointer items-center gap-1 px-1.5 py-0.5 text-left hover:bg-muted/60"
  >
    <span className="min-w-0 flex-1">{children}</span>
    <RiPencilLine className="size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover/edit:opacity-100 group-focus-visible/edit:opacity-100" />
  </button>
);

type User = {
  accountId: string;
  displayName: string;
  avatarUrls: { "48x48"?: string | null };
} | null;

export const PersonField = ({
  issueKey,
  fieldId,
  label,
  user,
  children,
}: {
  issueKey: string;
  fieldId: string;
  label: string;
  user: User;
  children: ReactNode;
}) => {
  const queryClient = useQueryClient();
  const { data: me } = useQuery(currentUserOptions());
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <EditButton label={label} onClick={() => setEditing(true)}>
        {children}
      </EditButton>
    );
  }

  return (
    <PeoplePicker
      issueKey={issueKey}
      value={
        user
          ? {
              kind: "user",
              accountId: user.accountId,
              displayName: user.displayName,
            }
          : { kind: "unassigned" }
      }
      placeholder="Search people"
      autoOpen
      onOpenChange={(open) => !open && setEditing(false)}
      onChange={(value) => {
        setEditing(false);
        const edit = value && personEdit(value, me);
        if (!edit) return;
        if ((edit.payload?.accountId ?? null) === (user?.accountId ?? null)) {
          return;
        }
        void editIssue(
          queryClient,
          issueKey,
          { fields: { [fieldId]: edit.payload } },
          { [fieldId]: edit.display },
        );
      }}
    />
  );
};

export const PriorityField = ({
  issueKey,
  priority,
  children,
}: {
  issueKey: string;
  priority: { name: string } | null;
  children: ReactNode;
}) => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { data: priorities } = useQuery({
    ...prioritiesOptions(),
    enabled: editing,
  });

  if (!editing) {
    return (
      <EditButton label="priority" onClick={() => setEditing(true)}>
        {children}
      </EditButton>
    );
  }

  return (
    <Picker
      options={(priorities ?? []).map((option) => ({
        value: option.id,
        label: option.name,
      }))}
      value={
        priorities?.find((option) => option.name === priority?.name)?.id ?? null
      }
      placeholder={priorities ? "Search priorities" : "Loading…"}
      className="w-full"
      defaultOpen
      autoFocus
      onOpenChange={(open) => !open && setEditing(false)}
      onChange={(id) => {
        setEditing(false);
        const next = priorities?.find((option) => option.id === id);
        if (!next || next.name === priority?.name) return;
        void editIssue(
          queryClient,
          issueKey,
          { fields: { priority: { id: next.id } } },
          { priority: { name: next.name, iconUrl: next.iconUrl } },
        );
      }}
    />
  );
};

export const NumberField = ({
  issueKey,
  fieldId,
  label,
  value,
}: {
  issueKey: string;
  fieldId: string;
  label: string;
  value: number | null;
}) => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <EditButton label={label} onClick={() => setEditing(true)}>
        {value ?? <span className="text-muted-foreground">–</span>}
      </EditButton>
    );
  }

  const save = (text: string) => {
    setEditing(false);
    const next = text.trim() === "" ? null : Number(text);
    if (Number.isNaN(next) || next === value) return;
    void editIssue(
      queryClient,
      issueKey,
      { fields: { [fieldId]: next } },
      { [fieldId]: next },
    );
  };

  return (
    <Input
      type="number"
      step="any"
      autoFocus
      defaultValue={value ?? ""}
      aria-label={label}
      className="h-7"
      onBlur={(event) => save(event.currentTarget.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") save(event.currentTarget.value);
        if (event.key === "Escape") {
          event.preventDefault();
          setEditing(false);
        }
      }}
    />
  );
};

export const LabelsField = ({
  issueKey,
  labels,
}: {
  issueKey: string;
  labels: string[];
}) => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { data: known } = useQuery({ ...labelsOptions(), enabled: editing });
  const listId = `labels-${issueKey}`;

  const change = (label: string, op: "add" | "remove") => {
    const next =
      op === "add"
        ? [...labels, label]
        : labels.filter((other) => other !== label);
    void editIssue(
      queryClient,
      issueKey,
      { update: { labels: [{ [op]: label }] } },
      { labels: next },
    );
  };

  if (!editing) {
    return (
      <EditButton label="labels" onClick={() => setEditing(true)}>
        {labels.length ? (
          <span className="flex flex-wrap gap-1">
            {labels.map((label) => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground">None</span>
        )}
      </EditButton>
    );
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: closes the editor when focus leaves it
    <div
      className="space-y-1.5"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setEditing(false);
        }
      }}
    >
      {labels.length ? (
        <span className="flex flex-wrap gap-1">
          {labels.map((label) => (
            <Badge key={label} variant="secondary" className="gap-0.5 pr-0.5">
              {label}
              <button
                type="button"
                aria-label={`Remove ${label}`}
                onClick={() => change(label, "remove")}
                className="cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <RiCloseLine className="size-3" />
              </button>
            </Badge>
          ))}
        </span>
      ) : null}
      <Input
        autoFocus
        list={listId}
        placeholder="Add a label"
        aria-label="Add a label"
        className="h-7"
        onKeyDown={(event) => {
          const input = event.currentTarget;
          // Jira labels can't contain spaces.
          const label = input.value.trim().replace(/\s+/g, "-");
          if (event.key === "Enter" && label) {
            event.preventDefault();
            if (!labels.includes(label)) change(label, "add");
            input.value = "";
          } else if (event.key === "Backspace" && !input.value) {
            const last = labels.at(-1);
            if (last) change(last, "remove");
          } else if (event.key === "Escape") {
            event.preventDefault();
            setEditing(false);
          }
        }}
      />
      <datalist id={listId}>
        {(known ?? [])
          .filter((label) => !labels.includes(label))
          .map((label) => (
            <option key={label} value={label} />
          ))}
      </datalist>
    </div>
  );
};

type Named = { id: string; name: string };

/** A multi-select over a list field like fix versions or components. */
const NamedListField = ({
  issueKey,
  fieldId,
  label,
  current,
  available,
}: {
  issueKey: string;
  fieldId: "fixVersions" | "components";
  label: string;
  current: Named[];
  available: Named[];
}) => {
  const queryClient = useQueryClient();
  // Options no longer offered (like released versions) stay listed while set.
  const options = [
    ...current,
    ...available.filter(
      (option) => !current.some((other) => other.id === option.id),
    ),
  ];
  const ids = current.map((option) => option.id);

  const save = (next: string[]) => {
    const added = next.filter((id) => !ids.includes(id));
    const removed = ids.filter((id) => !next.includes(id));
    if (!added.length && !removed.length) return;
    void editIssue(
      queryClient,
      issueKey,
      {
        update: {
          [fieldId]: [
            ...added.map((id) => ({ add: { id } })),
            ...removed.map((id) => ({ remove: { id } })),
          ],
        },
      },
      {
        [fieldId]: options
          .filter((option) => next.includes(option.id))
          .map(({ id, name }) => ({ id, name })),
      },
    );
  };

  return (
    <Select multiple value={ids} onValueChange={save}>
      <SelectTrigger
        aria-label={`Edit ${label}`}
        className={cn(
          "group/edit -mx-1.5 h-auto! w-[calc(100%+0.75rem)] min-w-0 cursor-pointer border-0 bg-transparent! px-1.5 py-0.5 hover:bg-muted/60!",
          "[&>svg]:opacity-0 hover:[&>svg]:opacity-100",
        )}
      >
        <SelectValue>
          {() =>
            current.length ? (
              <span className="flex flex-wrap gap-1">
                {current.map((option) => (
                  <Badge key={option.id} variant="outline">
                    {option.name}
                  </Badge>
                ))}
              </span>
            ) : (
              <span className="text-muted-foreground">None</span>
            )
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-80">
        <SelectGroup>
          {options.length ? (
            options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-1.5 text-muted-foreground">
              Nothing to pick from
            </div>
          )}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};

export const VersionsField = ({
  issueKey,
  versions,
}: {
  issueKey: string;
  versions: Named[];
}) => {
  const { data: unreleased } = useQuery(versionOptions());
  return (
    <NamedListField
      issueKey={issueKey}
      fieldId="fixVersions"
      label="fix versions"
      current={versions}
      available={unreleased ?? []}
    />
  );
};

export const ComponentsField = ({
  issueKey,
  components,
}: {
  issueKey: string;
  components: Named[];
}) => {
  const { data: available } = useQuery(componentsOptions());
  return (
    <NamedListField
      issueKey={issueKey}
      fieldId="components"
      label="components"
      current={components}
      available={available ?? []}
    />
  );
};
