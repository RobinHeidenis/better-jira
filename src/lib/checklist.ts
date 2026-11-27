import { z } from "zod";

export type ChecklistItem = {
  /** The item's line number, stable for as long as the text is unchanged. */
  id: number;
  status: string;
  /**
   * `partial` is any status a site added besides open, done and skipped
   * (like "done by dev"): further along than open, not finished.
   */
  state: "open" | "done" | "partial" | "skipped";
  done: boolean;
  text: string;
  note: string | null;
};

export type ChecklistGroup = {
  id: number;
  title: string | null;
  items: ChecklistItem[];
};

export type Checklist = {
  title: string | null;
  groups: ChecklistGroup[];
  done: number;
  /** Items in a partial status, counted per status. */
  partial: Record<string, number>;
  /** Every item except skipped ones. */
  total: number;
};

const stateOf = (status: string): ChecklistItem["state"] => {
  if (status === "open" || status === "") return "open";
  if (status === "done" || status === "x") return "done";
  if (status === "skipped") return "skipped";
  return "partial";
};

type AdfNode = { type?: string; text?: string; content?: AdfNode[] };

const inlineText = (node: AdfNode): string => {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(inlineText).join("");
};

/**
 * Rebuilds the plain-text format from the field's ADF. Usually that's one
 * paragraph holding the text verbatim, but once someone edits the field in
 * Jira's editor it reads the text as Markdown: `# name` turns into a numbered
 * item, `* [open] x` into a bullet, and `---group` into an empty bullet with
 * the group name nested one level down.
 */
const adfToChecklistText = (node: AdfNode, lines: string[] = []) => {
  const walkList = (list: AdfNode, ordered: boolean, groups: boolean) => {
    for (const item of list.content ?? []) {
      const [first, ...rest] = item.content ?? [];
      const text = first?.type === "paragraph" ? inlineText(first).trim() : "";
      if (text) {
        if (ordered) lines.push(`# ${text}`);
        else if (groups && !text.startsWith("[")) lines.push(`---${text}`);
        else lines.push(`* ${text}`);
      }
      for (const child of first?.type === "paragraph"
        ? rest
        : (item.content ?? [])) {
        if (child.type === "bulletList" || child.type === "orderedList") {
          walkList(child, child.type === "orderedList", !text);
        } else {
          adfToChecklistText(child, lines);
        }
      }
    }
  };

  switch (node.type) {
    case "paragraph":
      lines.push(...inlineText(node).split("\n"));
      break;
    case "bulletList":
    case "orderedList":
      walkList(node, node.type === "orderedList", false);
      break;
    case "blockquote":
      for (const line of adfToChecklistText({ content: node.content }, []))
        lines.push(`>> ${line.replace(/^>>\s*/, "")}`);
      break;
    default:
      for (const child of node.content ?? []) adfToChecklistText(child, lines);
  }
  return lines;
};

// API v3 wraps the plain-text field in an ADF doc; v2 or a plain text field
// sends the string as is.
const fieldText = z.union([
  z.string(),
  z
    .looseObject({ type: z.literal("doc"), content: z.array(z.any()) })
    .transform((doc) => adfToChecklistText(doc).join("\n")),
]);

const ITEM = /^\*\s*(?:\[([^\]]*)\]\s*)?(.*)$/;

/**
 * Parses Issue Checklist Pro's text format: `# name`, `---group`,
 * `* [status] item` and `>> note` lines under an item.
 */
export const parseChecklist = (value: unknown): Checklist | null => {
  const result = fieldText.safeParse(value);
  if (!result.success) return null;

  const checklist: Checklist = {
    title: null,
    groups: [],
    done: 0,
    partial: {},
    total: 0,
  };
  let group: ChecklistGroup | null = null;
  let item: ChecklistItem | null = null;

  for (const [lineNumber, raw] of result.data.split("\n").entries()) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("---")) {
      group = {
        id: lineNumber,
        title: line.slice(3).trim() || null,
        items: [],
      };
      checklist.groups.push(group);
      item = null;
    } else if (line.startsWith("#") && !checklist.title && !group) {
      checklist.title = line.replace(/^#+\s*/, "") || null;
    } else if (line.startsWith(">>") && item) {
      const note = line.slice(2).trim();
      item.note = item.note ? `${item.note}\n${note}` : note;
    } else {
      const match = ITEM.exec(line);
      const status = (match?.[1] ?? "open").trim().toLowerCase();
      const state = stateOf(status);
      item = {
        id: lineNumber,
        status,
        state,
        done: state === "done",
        text: (match ? match[2] : line).trim(),
        note: null,
      };
      if (!group) {
        group = { id: lineNumber, title: null, items: [] };
        checklist.groups.push(group);
      }
      group.items.push(item);
      if (state !== "skipped") checklist.total += 1;
      if (state === "done") checklist.done += 1;
      if (state === "partial") {
        checklist.partial[status] = (checklist.partial[status] ?? 0) + 1;
      }
    }
  }

  return checklist.total || checklist.groups.length ? checklist : null;
};

/** The checklist's text, rebuilt from ADF when the field arrives as such. */
export const checklistText = (value: unknown): string | null => {
  const result = fieldText.safeParse(value);
  return result.success ? result.data : null;
};

const itemsOf = (checklist: Checklist) =>
  checklist.groups.flatMap((group) => group.items);

/**
 * Line numbers shift when the text changes, so an item is found again by its
 * text, and by its position among items with the same text.
 */
export type ItemRef = { text: string; nth: number };

export const itemRef = (
  checklist: Checklist,
  item: ChecklistItem,
): ItemRef => ({
  text: item.text,
  nth: itemsOf(checklist)
    .filter((other) => other.text === item.text)
    .findIndex((other) => other.id === item.id),
});

/**
 * Sets the status of an item in the checklist's text. Returns the new text
 * and the status the item had, or null when the item isn't there.
 */
export const withItemStatus = (text: string, ref: ItemRef, status: string) => {
  const checklist = parseChecklist(text);
  const target = checklist
    ? itemsOf(checklist).filter((other) => other.text === ref.text)[ref.nth]
    : undefined;
  if (!target) return null;

  const lines = text.split("\n");
  lines[target.id] = (lines[target.id] ?? "").replace(
    /^(\s*\*\s*)(?:\[[^\]]*\]\s*)?/,
    `$1[${status}] `,
  );
  return { text: lines.join("\n"), previous: target.status };
};

export type ChecklistChange = {
  text: string;
  /** null when the item was added. */
  from: string | null;
  /** null when the item was removed. */
  to: string | null;
};

/** The items whose status changed, or that were added or removed. */
export const checklistChanges = (
  before: string | null,
  after: string | null,
): ChecklistChange[] => {
  const statuses = (text: string | null) => {
    const map = new Map<string, string>();
    for (const group of parseChecklist(text ?? "")?.groups ?? []) {
      for (const item of group.items) map.set(item.text, item.status);
    }
    return map;
  };
  const from = statuses(before);
  const to = statuses(after);
  const changes: ChecklistChange[] = [];
  for (const [text, status] of to) {
    const previous = from.get(text) ?? null;
    if (previous !== status) changes.push({ text, from: previous, to: status });
  }
  for (const [text, status] of from) {
    if (!to.has(text)) changes.push({ text, from: status, to: null });
  }
  return changes;
};
