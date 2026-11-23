import z from "zod";

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

export const inlineExtensionNode = z.object({
  type: z.literal("inlineExtension"),
  attrs: z
    .object({
      extensionKey: z.string().optional(),
      extensionType: z.string().optional(),
      parameters: z.unknown().optional(),
      text: z.string().optional(),
      localId: z.string().optional(),
    })
    .optional(),
});

export const mediaInlineNode = z.object({
  type: z.literal("mediaInline"),
  attrs: z
    .object({
      type: z.enum(["link", "file", "image"]).optional(),
      id: z.string().optional(),
      collection: z.string().optional(),
      alt: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      localId: z.string().optional(),
      occurrenceKey: z.string().optional(),
      data: z.unknown().optional(),
    })
    .optional(),
});
export type MediaInlineNode = z.infer<typeof mediaInlineNode>;

export const mentionNode = z.object({
  type: z.literal("mention"),
  attrs: z.object({
    id: z.string(),
    text: z.string().optional(),
    userType: z.enum(["DEFAULT", "SPECIAL", "APP"]).optional(),
  }),
});

export const placeholderNode = z.object({
  type: z.literal("placeholder"),
  attrs: z
    .object({
      text: z.string().optional(),
      localId: z.string().optional(),
    })
    .optional(),
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

export const codeMark = z.object({ type: z.literal("code") });
export const emMark = z.object({ type: z.literal("em") });
export const linkMark = z.object({
  type: z.literal("link"),
  attrs: z.object({
    href: z.string(),
    title: z.string().optional(),
    id: z.string().optional(),
    collection: z.string().optional(),
    occurrenceKey: z.string().optional(),
  }),
});
export const strikeMark = z.object({ type: z.literal("strike") });
export const strongMark = z.object({ type: z.literal("strong") });
export const subsupMark = z.object({
  type: z.literal("subsup"),
  attrs: z.object({ type: z.enum(["sub", "sup"]) }),
});
export const textColorMark = z.object({
  type: z.literal("textColor"),
  attrs: z.object({ color: z.string() }),
});
export const backgroundColorMark = z.object({
  type: z.literal("backgroundColor"),
  attrs: z.object({ color: z.string() }),
});
export const underlineMark = z.object({ type: z.literal("underline") });

export const textMark = z.discriminatedUnion("type", [
  backgroundColorMark,
  codeMark,
  emMark,
  linkMark,
  strikeMark,
  strongMark,
  subsupMark,
  textColorMark,
  underlineMark,
]);
export type TextMark = z.infer<typeof textMark>;

export const textNode = z.object({
  type: z.literal("text"),
  text: z.string(),
  marks: z.array(textMark).optional(),
});
export type TextNode = z.infer<typeof textNode>;

export const inlineNode = z.discriminatedUnion("type", [
  dateNode,
  emojiNode,
  hardBreakNode,
  inlineCardNode,
  inlineExtensionNode,
  mediaInlineNode,
  mentionNode,
  placeholderNode,
  statusNode,
  textNode,
]);
export type InlineNode = z.infer<typeof inlineNode>;
