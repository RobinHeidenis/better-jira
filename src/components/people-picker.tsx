import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { useRef, useState } from "react";
import { assignableUsersOptions } from "#/lib/api/transitions";
import { projectAssignableUsersOptions } from "#/lib/api/users";
import { store } from "#/lib/store";
import type { FormValue } from "#/lib/transition-form";
import { Picker, type PickerOption } from "./settings/field-picker";

const ME = "__me";
const UNASSIGNED = "__unassigned";
const EVERYONE = "__everyone";

/**
 * Picks a person who can be assigned the issue: "Me", the assignee
 * shortlist, "Unassigned", and "Someone else…" for everyone else.
 */
export const PeoplePicker = ({
  issueKey,
  value,
  onChange,
  placeholder,
  meDescription,
  autoOpen = false,
  onOpenChange,
  className = "w-full",
}: {
  issueKey: string;
  value: FormValue | undefined;
  onChange: (value: FormValue | undefined) => void;
  placeholder: string;
  meDescription?: string;
  autoOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) => {
  const project = useSelector(store, (state) => state.project);
  const shortlist = useSelector(store, (state) => state.assigneeShortlist);
  // The board's project list stands in until this issue's own list arrives.
  const { data: projectUsers } = useQuery(
    projectAssignableUsersOptions(project),
  );
  const { data: users, isPending } = useQuery({
    ...assignableUsersOptions(issueKey),
    placeholderData: projectUsers,
  });
  const [showEveryone, setShowEveryone] = useState(false);
  // Picking "Someone else…" closes the list on its way to reopening it.
  const reopening = useRef(false);

  const shortlisted =
    shortlist.length && !showEveryone
      ? (users ?? []).filter((user) => shortlist.includes(user.accountId))
      : (users ?? []);
  const people: PickerOption[] = shortlisted.map((user) => ({
    value: user.accountId,
    label: user.displayName,
  }));
  // The chosen person may be off the shortlist, or not in this project at all.
  if (
    value?.kind === "user" &&
    !people.some((person) => person.value === value.accountId)
  ) {
    const user = users?.find((user) => user.accountId === value.accountId);
    people.push({
      value: value.accountId,
      label: user?.displayName ?? value.displayName,
    });
  }
  const options: PickerOption[] = [
    { value: ME, label: "Me", description: meDescription },
    ...people,
    { value: UNASSIGNED, label: "Unassigned" },
  ];
  if (users && shortlisted.length < users.length) {
    options.push({
      value: EVERYONE,
      label: "Someone else…",
      description: `Show all ${users.length} people`,
    });
  }

  const selected =
    value?.kind === "me"
      ? ME
      : value?.kind === "unassigned"
        ? UNASSIGNED
        : value?.kind === "user"
          ? value.accountId
          : null;

  return (
    <Picker
      // Remounted to reopen with everyone once "Someone else…" is picked.
      key={showEveryone ? "everyone" : "shortlist"}
      options={options}
      value={selected}
      placeholder={isPending && !users ? "Loading people…" : placeholder}
      className={className}
      defaultOpen={autoOpen || showEveryone}
      autoFocus={autoOpen || showEveryone}
      onOpenChange={(open) => {
        if (open || !onOpenChange) return;
        // The value change that says why it closed lands after this.
        setTimeout(() => {
          if (reopening.current) reopening.current = false;
          else onOpenChange(false);
        });
      }}
      onChange={(next) => {
        if (next === EVERYONE) {
          reopening.current = true;
          setShowEveryone(true);
        } else if (next === null) onChange(undefined);
        else if (next === ME) onChange({ kind: "me" });
        else if (next === UNASSIGNED) onChange({ kind: "unassigned" });
        else {
          const user = users?.find((user) => user.accountId === next);
          onChange({
            kind: "user",
            accountId: next,
            displayName: user?.displayName ?? next,
            avatarUrl: user?.avatarUrls?.["48x48"] ?? undefined,
          });
        }
      }}
    />
  );
};

type Me = {
  accountId: string;
  displayName: string;
  avatarUrls: { "48x48": string };
};

/** What to send Jira for a picked person, and what to show meanwhile. */
export const personEdit = (value: FormValue, me: Me | undefined) => {
  switch (value.kind) {
    case "me":
      return me
        ? {
            payload: { accountId: me.accountId },
            display: {
              accountId: me.accountId,
              displayName: me.displayName,
              avatarUrls: { "48x48": me.avatarUrls["48x48"] },
            },
          }
        : null;
    case "unassigned":
      return { payload: null, display: null };
    case "user":
      return {
        payload: { accountId: value.accountId },
        display: {
          accountId: value.accountId,
          displayName: value.displayName,
          avatarUrls: { "48x48": value.avatarUrl ?? null },
        },
      };
    default:
      return null;
  }
};
