import { useSyncExternalStore } from "react";
import { getChecklistText, putChecklistText } from "./api/checklist";
import {
  countItems,
  type GroupTarget,
  type ItemRef,
  withAddedItem,
  withItemStatus,
} from "./checklist";

/**
 * Issue Checklist Pro reads its text field when it changes, then writes the
 * field back from its own state a few seconds later. A second write landing
 * in that window gets overwritten by the app's stale copy. So clicks are
 * gathered into one write, and after each write the field is read again once
 * the app has settled, and anything it undid is written again.
 */

export type ChecklistChange = {
  ref: ItemRef;
  /** The status in Jira when the item was first clicked. */
  original: string;
  status: string;
  written?: boolean;
  /** Writes of the current status, so one Jira keeps undoing can give up. */
  writes?: number;
};

export type ChecklistAddition = {
  text: string;
  group: GroupTarget;
  /** Items with this text before it was added, to tell when it's in. */
  before: number;
  written?: boolean;
  writes?: number;
};

type State = {
  changes: ChecklistChange[];
  additions: ChecklistAddition[];
  error: string | null;
};

type Sync = {
  state: State;
  listeners: Set<() => void>;
  timer?: ReturnType<typeof setTimeout>;
  running: boolean;
  fieldId: string;
  /** Reloads the issue; resolves once the new copy is in. */
  reload: () => Promise<unknown>;
};

const GATHER_MS = 800;
const SETTLE_MS = 5000;
const MAX_WRITES = 3;

const EMPTY: State = { changes: [], additions: [], error: null };
const syncs = new Map<string, Sync>();

const sameItem = (a: ItemRef, b: ItemRef) =>
  a.text === b.text && a.nth === b.nth;

const update = (sync: Sync, state: Partial<State>) => {
  sync.state = { ...sync.state, ...state };
  for (const listener of sync.listeners) listener();
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const run = async (issueKey: string, sync: Sync) => {
  if (sync.running) return;
  sync.running = true;
  const errors: string[] = [];
  // What each change's status was when Jira last matched it.
  let checked = new Map<ChecklistChange, string>();
  // Additions Jira has (or that gave up), so they can be dropped.
  const added = new Set<ChecklistAddition>();

  try {
    for (;;) {
      const text = await getChecklistText(issueKey, sync.fieldId);
      let next = text;

      // New items go in first, so a tick on one that isn't in Jira yet finds
      // it below.
      const toAdd: ChecklistAddition[] = [];
      for (const addition of sync.state.additions) {
        if (
          addition.written &&
          countItems(text, addition.text) > addition.before
        ) {
          added.add(addition);
          continue;
        }
        added.delete(addition);
        if ((addition.writes ?? 0) >= MAX_WRITES) {
          errors.push(
            `Jira kept undoing "${addition.text}". Try adding it again in a moment.`,
          );
          added.add(addition);
          continue;
        }
        // Counted on Jira's own text, since the copy on screen can be stale.
        if (!addition.written)
          addition.before = countItems(next, addition.text);
        next = withAddedItem(next, addition.group, addition.text);
        toAdd.push(addition);
      }

      checked = new Map(
        sync.state.changes.map((change) => [change, change.status]),
      );
      const toWrite: ChecklistChange[] = [];

      for (const change of checked.keys()) {
        const result = withItemStatus(next, change.ref, change.status);
        if (!result) {
          errors.push(`"${change.ref.text}" was removed from the checklist.`);
          continue;
        }
        if (result.previous === change.status) continue;
        // Once written, a mismatch is the app undoing it; before that, it's
        // someone else's edit, which wins.
        if (!change.written && result.previous !== change.original) {
          errors.push(
            `Someone set "${change.ref.text}" to ${result.previous} in the meantime.`,
          );
          continue;
        }
        if ((change.writes ?? 0) >= MAX_WRITES) {
          errors.push(
            `Jira kept undoing the change to "${change.ref.text}". Try again in a moment.`,
          );
          continue;
        }
        next = result.text;
        toWrite.push(change);
      }

      if (!toWrite.length && !toAdd.length) break;
      await putChecklistText(issueKey, sync.fieldId, next);
      for (const change of [...toWrite, ...toAdd]) {
        change.written = true;
        change.writes = (change.writes ?? 0) + 1;
      }
      await sleep(SETTLE_MS);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    checked = new Map(
      sync.state.changes.map((change) => [change, change.status]),
    );
    for (const addition of sync.state.additions) added.add(addition);
  }

  // Reload before dropping the changes, so the ticks don't flicker back.
  await sync.reload().catch(() => {});
  update(sync, {
    changes: sync.state.changes.filter(
      (change) => checked.get(change) !== change.status,
    ),
    additions: sync.state.additions.filter((addition) => !added.has(addition)),
    error: errors.length ? errors.join(" ") : sync.state.error,
  });
  sync.running = false;
  if (sync.state.changes.length || sync.state.additions.length) {
    void run(issueKey, sync);
  }
};

const syncFor = (issueKey: string) => {
  let sync = syncs.get(issueKey);
  if (!sync) {
    sync = {
      state: EMPTY,
      listeners: new Set(),
      running: false,
      fieldId: "",
      reload: async () => {},
    };
    syncs.set(issueKey, sync);
  }
  return sync;
};

export const queueChecklistChange = (
  issueKey: string,
  fieldId: string,
  reload: () => Promise<unknown>,
  change: { ref: ItemRef; current: string; status: string },
) => {
  const sync = syncFor(issueKey);
  sync.fieldId = fieldId;
  sync.reload = reload;

  // Updated in place, so a save in flight still knows it wrote this item.
  const existing = sync.state.changes.find((other) =>
    sameItem(other.ref, change.ref),
  );
  if (existing) {
    existing.status = change.status;
    existing.writes = 0;
  }
  update(sync, {
    changes: existing
      ? [...sync.state.changes]
      : [
          ...sync.state.changes,
          { ref: change.ref, original: change.current, status: change.status },
        ],
    error: null,
  });

  clearTimeout(sync.timer);
  sync.timer = setTimeout(() => void run(issueKey, sync), GATHER_MS);
};

export const queueChecklistAddition = (
  issueKey: string,
  fieldId: string,
  reload: () => Promise<unknown>,
  addition: { text: string; group: GroupTarget; currentText: string },
) => {
  const sync = syncFor(issueKey);
  sync.fieldId = fieldId;
  sync.reload = reload;
  // Counted on the shown text, which already has earlier additions in it.
  const before = countItems(addition.currentText, addition.text);
  update(sync, {
    additions: [
      ...sync.state.additions,
      { text: addition.text, group: addition.group, before },
    ],
    error: null,
  });
  clearTimeout(sync.timer);
  sync.timer = setTimeout(() => void run(issueKey, sync), GATHER_MS);
};

export const dismissChecklistError = (issueKey: string) => {
  const sync = syncs.get(issueKey);
  if (sync) update(sync, { error: null });
};

/** Changes not yet confirmed in Jira, to show on top of the loaded issue. */
export const useChecklistSync = (issueKey: string | undefined) =>
  useSyncExternalStore(
    (listener) => {
      if (!issueKey) return () => {};
      const sync = syncFor(issueKey);
      sync.listeners.add(listener);
      return () => sync.listeners.delete(listener);
    },
    () => (issueKey ? (syncs.get(issueKey)?.state ?? EMPTY) : EMPTY),
    () => EMPTY,
  );

/** The text with unconfirmed additions and changes applied. */
export const withChanges = (
  text: string,
  { changes, additions }: Pick<State, "changes" | "additions">,
) => {
  const withAdditions = additions.reduce(
    (current, addition) =>
      countItems(current, addition.text) > addition.before
        ? current
        : withAddedItem(current, addition.group, addition.text),
    text,
  );
  return changes.reduce(
    (current, change) =>
      withItemStatus(current, change.ref, change.status)?.text ?? current,
    withAdditions,
  );
};
