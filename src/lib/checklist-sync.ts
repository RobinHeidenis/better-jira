import { useSyncExternalStore } from "react";
import { getChecklistText, putChecklistText } from "./api/checklist";
import { type ItemRef, withItemStatus } from "./checklist";

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
};

type State = { changes: ChecklistChange[]; error: string | null };

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
const MAX_WRITES = 4;

const EMPTY: State = { changes: [], error: null };
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

  try {
    for (let writes = 0; ; writes++) {
      const text = await getChecklistText(issueKey, sync.fieldId);
      let next = text;
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
        next = result.text;
        toWrite.push(change);
      }

      if (!toWrite.length) break;
      if (writes === MAX_WRITES) {
        errors.push("Jira kept undoing the change. Try again in a moment.");
        break;
      }
      await putChecklistText(issueKey, sync.fieldId, next);
      for (const change of toWrite) change.written = true;
      await sleep(SETTLE_MS);
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    checked = new Map(
      sync.state.changes.map((change) => [change, change.status]),
    );
  }

  // Reload before dropping the changes, so the ticks don't flicker back.
  await sync.reload().catch(() => {});
  update(sync, {
    changes: sync.state.changes.filter(
      (change) => checked.get(change) !== change.status,
    ),
    error: errors.length ? errors.join(" ") : sync.state.error,
  });
  sync.running = false;
  if (sync.state.changes.length) void run(issueKey, sync);
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
  if (existing) existing.status = change.status;
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

/** The text with unconfirmed changes applied. */
export const withChanges = (text: string, changes: ChecklistChange[]) =>
  changes.reduce(
    (current, change) =>
      withItemStatus(current, change.ref, change.status)?.text ?? current,
    text,
  );
