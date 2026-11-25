import { z } from "zod";

export type ChecklistItem = {
  /** The item's line number, stable for as long as the text is unchanged. */
  id: number;
  status: string;
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
  total: number;
};

type AdfNode = { type?: string; text?: string; content?: AdfNode[] };

const adfText = (node: AdfNode): string => {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const inner = (node.content ?? []).map(adfText).join("");
  return node.type === "paragraph" ? `${inner}\n` : inner;
};

// API v3 wraps the plain-text field in an ADF doc; v2 or a plain text field
// sends the string as is.
const fieldText = z.union([
  z.string(),
  z
    .looseObject({ type: z.literal("doc"), content: z.array(z.any()) })
    .transform((doc) => adfText(doc)),
]);

const ITEM = /^\*\s*(?:\[([^\]]*)\]\s*)?(.*)$/;

/**
 * Parses Issue Checklist Pro's text format: `# name`, `---group`,
 * `* [status] item` and `>> note` lines under an item.
 */
export const parseChecklist = (value: unknown): Checklist | null => {
  const result = fieldText.safeParse(value);
  if (!result.success) return null;

  const checklist: Checklist = { title: null, groups: [], done: 0, total: 0 };
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
      item = {
        id: lineNumber,
        status,
        done: status === "done" || status === "x",
        text: (match ? match[2] : line).trim(),
        note: null,
      };
      if (!group) {
        group = { id: lineNumber, title: null, items: [] };
        checklist.groups.push(group);
      }
      group.items.push(item);
      checklist.total += 1;
      if (item.done) checklist.done += 1;
    }
  }

  return checklist.total || checklist.groups.length ? checklist : null;
};
