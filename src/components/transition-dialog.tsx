import {
  RiCloseLine,
  RiExternalLinkLine,
  RiSettings3Line,
} from "@remixicon/react";
import { useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { cn } from "cn";
import { useState } from "react";
import type { Transition } from "#/lib/api/transitions";
import { jiraIssueUrl } from "#/lib/jira-url";
import { store } from "#/lib/store";
import {
  dismissTransitionError,
  formDefaults,
  runTransition,
  type TransitionTarget,
  transitionDialog,
  transitionErrors,
} from "#/lib/transition";
import {
  type FormField,
  type FormValue,
  type FormValues,
  formFields,
  isEmpty,
  missingFields,
  optionLabel,
} from "#/lib/transition-form";
import { PeoplePicker } from "./people-picker";
import { Picker } from "./settings/field-picker";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";

const FieldInput = ({
  entry,
  issueKey,
  value,
  onChange,
  autoOpen = false,
}: {
  entry: FormField;
  /** Opens a picker straight away, for a form with nothing else to fill in. */
  autoOpen?: boolean;
  issueKey: string;
  value: FormValue | undefined;
  onChange: (value: FormValue | undefined) => void;
}) => {
  const allowed = (entry.field.allowedValues ?? []).flatMap((option) =>
    option.id ? [{ id: option.id, label: optionLabel(option) }] : [],
  );

  switch (entry.kind) {
    case "user":
      return (
        <PeoplePicker
          issueKey={issueKey}
          value={value}
          onChange={onChange}
          autoOpen={autoOpen}
          placeholder="Leave as is"
          meDescription="Whoever moves the ticket"
        />
      );
    case "option":
      return (
        <Picker
          options={allowed.map((option) => ({
            value: option.id,
            label: option.label,
          }))}
          value={value?.kind === "option" ? value.id : null}
          placeholder="Leave as is"
          className="w-full"
          defaultOpen={autoOpen}
          onChange={(id) => {
            const option = allowed.find((option) => option.id === id);
            onChange(option ? { kind: "option", ...option } : undefined);
          }}
        />
      );
    case "options": {
      const items = value?.kind === "options" ? value.items : [];
      return (
        <div className="flex flex-wrap gap-1">
          {allowed.map((option) => {
            const on = items.some((item) => item.id === option.id);
            return (
              <Button
                key={option.id}
                type="button"
                size="xs"
                variant={on ? "default" : "outline"}
                aria-pressed={on}
                onClick={() => {
                  const next = on
                    ? items.filter((item) => item.id !== option.id)
                    : [...items, option];
                  onChange(
                    next.length ? { kind: "options", items: next } : undefined,
                  );
                }}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      );
    }
    case "text":
    case "textarea": {
      const Control = entry.kind === "text" ? Input : Textarea;
      return (
        <Control
          value={value?.kind === "text" ? value.text : ""}
          onChange={(event) =>
            onChange(
              event.target.value
                ? { kind: "text", text: event.target.value }
                : undefined,
            )
          }
        />
      );
    }
    case "number":
      return (
        <Input
          type="number"
          value={value?.kind === "number" ? value.number : ""}
          onChange={(event) =>
            onChange(
              event.target.value === ""
                ? undefined
                : { kind: "number", number: Number(event.target.value) },
            )
          }
        />
      );
    default:
      return (
        <p className="text-muted-foreground">
          This field can only be set in Jira.
        </p>
      );
  }
};

const describe = (value: FormValue) => {
  switch (value.kind) {
    case "me":
      return "you";
    case "unassigned":
      return "nobody";
    case "user":
      return value.displayName;
    case "option":
      return value.label;
    case "options":
      return value.items.map((item) => item.label).join(", ");
    case "text":
      return `"${value.text}"`;
    case "number":
      return String(value.number);
  }
};

const TransitionForm = ({
  issue,
  transition,
  others = [],
  onClose,
}: {
  issue: TransitionTarget;
  transition: Transition;
  others?: { issue: TransitionTarget; transition: Transition }[];
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const baseUrl = useSelector(store, (state) => state.baseUrl);
  const saved = useSelector(
    store,
    (state) => state.transitionForms[transition.to.id],
  );
  const fields = formFields(transition);
  const [values, setValues] = useState<FormValues>(() =>
    formDefaults(transition),
  );
  const [hidden, setHidden] = useState(() => new Set(saved?.hidden ?? []));
  const [customizing, setCustomizing] = useState(false);

  const missing = missingFields(fields, values);
  const unsupported = missing.filter((entry) => entry.kind === null);
  const shown = customizing
    ? fields
    : fields.filter(
        (entry) =>
          !hidden.has(entry.key) ||
          missing.some((other) => other.key === entry.key),
      );
  const silent = fields.filter(
    (entry) =>
      !shown.includes(entry) && entry.kind && !isEmpty(values[entry.key]),
  );

  const saveForm = () => {
    const defaults = Object.fromEntries(
      Object.entries(values).filter(
        (entry): entry is [string, FormValue] => !isEmpty(entry[1]),
      ),
    );
    store.setState((state) => ({
      ...state,
      transitionForms: {
        ...state.transitionForms,
        [transition.to.id]: {
          status: transition.to.name,
          hidden: [...hidden],
          defaults,
        },
      },
    }));
    setCustomizing(false);
  };

  const resetForm = () => {
    store.setState((state) => {
      const { [transition.to.id]: _, ...rest } = state.transitionForms;
      return { ...state, transitionForms: rest };
    });
    setValues({});
    setHidden(new Set());
  };

  const submit = () => {
    if (missing.length) return;
    onClose();
    void runTransition(queryClient, issue, transition, values);
    for (const other of others) {
      void runTransition(queryClient, other.issue, other.transition, values);
    }
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (customizing) saveForm();
        else submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {customizing
            ? `Form for moving to ${transition.to.name}`
            : others.length
              ? `Move ${others.length + 1} tickets to ${transition.to.name}`
              : `Move ${issue.key} to ${transition.to.name}`}
        </DialogTitle>
        <DialogDescription>
          {customizing
            ? "Pick which fields to ask for. The values you fill in become the defaults for every ticket moved here."
            : others.length
              ? [issue, ...others.map((other) => other.issue)]
                  .map((target) => target.key)
                  .join(", ")
              : transition.name !== transition.to.name
                ? transition.name
                : issue.summary}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3">
        {shown.map((entry) => (
          <div
            key={entry.key}
            data-autofocus={entry === shown[0] && !customizing ? "" : undefined}
            className={cn(
              "grid gap-1.5",
              customizing && hidden.has(entry.key) && "opacity-60",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">
                {entry.field.name}
                {entry.field.required ? (
                  <span className="text-destructive"> *</span>
                ) : null}
              </span>
              {customizing ? (
                // biome-ignore lint/a11y/noLabelWithoutControl: the Switch renders the control
                <label className="flex items-center gap-1.5 text-muted-foreground">
                  Ask
                  <Switch
                    size="sm"
                    checked={!hidden.has(entry.key)}
                    onCheckedChange={(ask) =>
                      setHidden((current) => {
                        const next = new Set(current);
                        if (ask) next.delete(entry.key);
                        else next.add(entry.key);
                        return next;
                      })
                    }
                  />
                </label>
              ) : null}
            </div>
            <FieldInput
              entry={entry}
              autoOpen={shown.length === 1 && !customizing}
              issueKey={issue.key}
              value={values[entry.key]}
              onChange={(value) =>
                setValues((current) => ({ ...current, [entry.key]: value }))
              }
            />
          </div>
        ))}
        {!shown.length && !customizing ? (
          <p className="text-muted-foreground">Nothing to fill in.</p>
        ) : null}
        {silent.length && !customizing ? (
          <p className="text-muted-foreground">
            Also sets{" "}
            {silent
              .map((entry) => {
                const value = values[entry.key];
                return `${entry.field.name} to ${value ? describe(value) : ""}`;
              })
              .join(", ")}
            .
          </p>
        ) : null}
        {unsupported.length && !customizing ? (
          <p className="text-destructive">
            Jira requires{" "}
            {unsupported.map((entry) => entry.field.name).join(", ")}, which can
            only be set in Jira.
            {baseUrl ? (
              <>
                {" "}
                <a
                  href={jiraIssueUrl(baseUrl, issue.key)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline"
                >
                  Open in Jira
                  <RiExternalLinkLine className="size-3" />
                </a>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <DialogFooter className="sm:justify-between">
        {customizing ? (
          <>
            <Button
              type="button"
              variant="ghost"
              disabled={!saved}
              onClick={resetForm}
            >
              Reset
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setValues(formDefaults(transition));
                  setHidden(new Set(saved?.hidden ?? []));
                  setCustomizing(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save form</Button>
            </div>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCustomizing(true)}
            >
              <RiSettings3Line />
              Customize form
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={missing.length > 0}>
                Move
              </Button>
            </div>
          </>
        )}
      </DialogFooter>
    </form>
  );
};

/** The transition form and transition errors, wherever transitions start. */
export const TransitionHost = () => {
  const request = useSelector(transitionDialog, (state) => state);
  const errors = useSelector(transitionErrors, (state) => state);
  const close = () => transitionDialog.setState(() => null);

  return (
    <>
      <Dialog open={!!request} onOpenChange={(open) => !open && close()}>
        <DialogContent
          className="sm:max-w-md"
          // The first field gets focus, so it can be filled in straight away.
          initialFocus={() =>
            document.querySelector<HTMLElement>(
              "[data-autofocus] :is(input, textarea, button)",
            )
          }
        >
          {request ? (
            <TransitionForm
              key={`${request.issue.key}:${request.transition.id}`}
              issue={request.issue}
              transition={request.transition}
              others={request.others}
              onClose={close}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      {errors.length ? (
        <div className="fixed right-4 bottom-4 z-50 grid w-96 gap-2">
          {errors.map((error) => (
            <div
              key={error.id}
              role="alert"
              className="flex items-start gap-2 border border-destructive/40 bg-popover px-3 py-2 text-destructive shadow-md"
            >
              <span className="flex-1">{error.message}</span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => dismissTransitionError(error.id)}
                className="text-muted-foreground hover:text-foreground"
              >
                <RiCloseLine className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
};
