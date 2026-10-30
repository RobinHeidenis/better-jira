import z from "zod";
import { inlineNode, inlineNodeTypes, textNode } from "./inline-nodes";

export const blockNodeTypes = z.enum([
  "blockquote",
  // "bodiedSyncBlock", can't find docs on this
  "bulletList",
  "codeBlock",
  "expand",
  "heading",
  "mediaGroup",
  "mediaSingle",
  "orderedList",
  "panel",
  "paragraph",
  "rule",
  "syncBlock",
  "table",
  "multiBodiedExtension",
]);

const childBlockNodeTypes = z.enum([
  "blockTaskItem",
  "extensionFrame",
  "listItem",
  "media",
  "nestedExpand",
  "tableCell",
  "tableHeader",
  "tableRow",
]);

export const paragraphNode = z.object({
  type: z.literal("paragraph"),
  content: z.array(inlineNode).optional(),
});
export type ParagraphNode = z.infer<typeof paragraphNode>;

export const headingNode = z.object({
  type: z.literal("heading"),
  attrs: z.object({
    level: z.number(),
  }),
  content: z.array(inlineNode).optional(),
});
export type HeadingNode = z.infer<typeof headingNode>;

export const listItemNode = z.object({
  type: z.literal("listItem"),
  get content() {
    return z.array(contentNode).optional();
  },
});

export const bulletListNode = z.object({
  type: z.literal("bulletList"),
  content: z.array(listItemNode).optional(),
});

export const orderedListNode = z.object({
  type: z.literal("orderedList"),
  content: z.array(listItemNode).optional(),
  attrs: z.object({
    order: z.number(),
  }),
});

export const codeBlockNode = z.object({
  type: z.literal("codeBlock"),
  content: z.array(textNode).optional(),
  attrs: z.object({
    language: z.string().optional(),
    wrap: z.boolean().optional(),
    hideLineNumbers: z.boolean().optional(),
  }),
});

export const contentNode = z.discriminatedUnion("type", [
  paragraphNode,
  bulletListNode,
  orderedListNode,
  codeBlockNode,
  // mediaGroup
  // mediaSingle
]);

export const blockquoteNode = z.object({
  type: z.literal("blockquote"),
  content: z.array(contentNode).optional(),
});

export const expandNode = z.object({
  type: z.literal("expand"),
  content: z.array(contentNode).optional(),
  attrs: z.object({
    title: z.string(),
  }),
});

export const ruleNode = z.object({
  type: z.literal("rule"),
});

export const panelNode = z.object({
  type: z.literal("panel"),
  content: z
    .array(
      z.discriminatedUnion("type", [
        bulletListNode,
        headingNode,
        orderedListNode,
        paragraphNode,
      ]),
    )
    .optional(),
  attrs: z.object({
    panelType: z.enum(["info", "note", "warning", "success", "error"]),
  }),
});

export const blockNode = z.discriminatedUnion("type", [
  bulletListNode,
  orderedListNode,
  codeBlockNode,
  paragraphNode,
  headingNode,
  expandNode,
  ruleNode,
  panelNode,
  blockquoteNode,
]);
export type BlockNode = z.infer<typeof blockNode>;

export const node = z.discriminatedUnion("type", [
  // in inline nodes there's no content
  z.object({
    type: inlineNodeTypes,
    marks: z.array(z.unknown()).optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
  }),
  z.object({
    type: z.union([blockNodeTypes, childBlockNodeTypes]),
    content: z.array(z.unknown()).optional(),
    marks: z.array(z.unknown()).optional(),
    attrs: z.record(z.string(), z.unknown()).optional(),
  }),
]);
export type Node = z.infer<typeof node>;
