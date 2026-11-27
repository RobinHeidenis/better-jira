import { Combobox as ComboboxPrimitive } from "@base-ui/react";
import { RiSearchLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Store, useSelector } from "@tanstack/react-store";
import { cn } from "cn";
import { useEffect, useState } from "react";
import { type FoundIssue, issueSearchOptions } from "#/lib/api/search";
import { store } from "#/lib/store";
import { useStatusTone } from "./related-issues";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Spinner } from "./ui/spinner";

const Results = ({ onPick }: { onPick: (issue: FoundIssue) => void }) => {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const tone = useStatusTone();
  const { data, isFetching, error } = useQuery(issueSearchOptions(debounced));
  const issues = data ?? [];

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <ComboboxPrimitive.Root
      inline
      open
      autoHighlight
      // Jira already did the matching.
      filter={null}
      items={issues}
      inputValue={query}
      onInputValueChange={setQuery}
      value={null}
      onValueChange={(issue: FoundIssue | null) => issue && onPick(issue)}
      itemToStringLabel={(issue: FoundIssue) =>
        `${issue.key} ${issue.fields.summary}`
      }
      isItemEqualToValue={(a: FoundIssue, b: FoundIssue) => a.id === b.id}
    >
      <div className="flex items-center gap-2 border-b px-3">
        <RiSearchLine className="size-4 shrink-0 text-muted-foreground" />
        <ComboboxPrimitive.Input
          autoFocus
          placeholder="Find an issue by key or text"
          aria-label="Find an issue"
          className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {isFetching ? <Spinner className="size-4" /> : null}
      </div>
      <div className="px-3 pt-2 pb-1 text-muted-foreground">
        {debounced.trim() ? "Results" : "Recently viewed"}
      </div>
      <ComboboxPrimitive.List className="max-h-[min(60vh,28rem)] scroll-py-1 overflow-y-auto overscroll-contain px-1 pb-1">
        {(issue: FoundIssue) => (
          <ComboboxPrimitive.Item
            key={issue.id}
            value={issue}
            className="flex cursor-default items-center gap-2 px-2 py-2 outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
          >
            {issue.fields.issuetype?.iconUrl ? (
              <img
                src={issue.fields.issuetype.iconUrl}
                alt={issue.fields.issuetype.name}
                className="size-4 shrink-0"
              />
            ) : null}
            <span className="w-20 shrink-0 text-muted-foreground tabular-nums">
              {issue.key}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {issue.fields.summary}
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  tone(issue.fields.status),
                )}
              />
              {issue.fields.status.name}
            </span>
          </ComboboxPrimitive.Item>
        )}
      </ComboboxPrimitive.List>
      {!issues.length && !isFetching ? (
        <p className="px-3 pb-4 text-muted-foreground">
          {error ? error.message : "No issues found"}
        </p>
      ) : null}
    </ComboboxPrimitive.Root>
  );
};

export const issuePaletteOpen = new Store(false);

const setOpen = (open: boolean | ((current: boolean) => boolean)) =>
  issuePaletteOpen.setState((current) =>
    typeof open === "function" ? open(current) : open,
  );

/** Cmd+K (Ctrl+K) finds any issue the user can see, on the board or not. */
export const IssuePalette = () => {
  const open = useSelector(issuePaletteOpen, (state) => state);
  const navigate = useNavigate();
  const ready = useSelector(
    store,
    (state) => !!state.apiToken && !!state.baseUrl,
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k") return;
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
        return;
      }
      event.preventDefault();
      setOpen((current) => !current);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!ready) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[15vh] translate-y-0 gap-0 p-0 sm:max-w-2xl"
      >
        <DialogTitle className="sr-only">Find an issue</DialogTitle>
        {open ? (
          <Results
            onPick={(issue) => {
              setOpen(false);
              void navigate({
                to: "/issue/$issueId",
                params: { issueId: issue.key },
              });
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
