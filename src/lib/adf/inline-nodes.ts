import z from "zod";

export const inlineNodeTypes = z.enum([
  "date",
  "emoji",
  "hardBreak",
  "inlineCard",
  "mention",
  "status",
  "text",
]);
export type InlineNodeTypes = z.infer<typeof inlineNodeTypes>;

export const dateNode = z.object({
  type: z.literal("date"),
  attrs: z.object({
    timestamp: z.number(),
  }),
});
export type DateNode = z.infer<typeof dateNode>;

const unicodeEmoji = z.object({
  shortName: z.string(),
  text: z.string().optional(),
});

const nonStandardEmoji = z.object({
  id: z.string().optional(),
  shortName: z.string(),
  text: z.string().optional(),
});

export const emojiNode = z.object({
  type: z.literal("emoji"),
  attrs: z.union([unicodeEmoji, nonStandardEmoji]),
});

export const hardBreakNode = z.object({
  type: z.literal("hardBreak"),
  attrs: z.object({ text: z.string().optional() }).optional(),
});

export const inlineCardNode = z.object({
  type: z.literal("inlineCard"),
  attrs: z.object({
    url: z.string(),
  }),
});

export const mentionNode = z.object({
  type: z.literal("mention"),
  attrs: z.object({
    id: z.string(),
    text: z.string().optional(),
    userType: z.enum(["DEFAULT", "SPECIAL", "APP"]).optional(),
  }),
});

export const statusNode = z.object({
  type: z.literal("status"),
  attrs: z.object({
    color: z.union([
      z.enum(["neutral", "purple", "blue", "red", "yellow", "green"]),
      z.string().regex(/^#[0-9A-F]{6}$/i),
    ]),
    text: z.string(),
    localId: z.string().optional(),
  }),
});

export const textNode = z.object({
  type: z.literal("text"),
  text: z.string(),
  marks: z.array(z.unknown()).optional(),
});
export type TextNode = z.infer<typeof textNode>;

export const inlineNode = z.discriminatedUnion("type", [
  dateNode,
  emojiNode,
  hardBreakNode,
  inlineCardNode,
  mentionNode,
  statusNode,
  textNode,
]);
