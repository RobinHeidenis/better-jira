import z from "zod";
import { inlineNode, inlineNodeTypes } from "./adf/inline-nodes";

export const blockNodeTypes = z.enum([
  "blockquote",
  "bodiedSyncBlock",
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

export const blockNode = z.discriminatedUnion("type", [
  paragraphNode,
  headingNode,
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

const markTypes = z.enum([
  "border",
  "code",
  "em",
  "link",
  "strike",
  "strong",
  "subsup",
  "textColor",
  "underline",
]);

export const mark = z.object({
  type: markTypes,
  attrs: z.record(z.string(), z.unknown()).optional(),
});
