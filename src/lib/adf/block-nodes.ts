import z from "zod";
import { inlineNode, textNode } from "./inline-nodes";

// Child lists follow the ADF JSON schema (go.atlassian.com/adf-json-schema),
// which is more complete than the per-node pages on developer.atlassian.com.

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
    return z.array(listItemContentNode).optional();
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

export const blockquoteNode = z.object({
  type: z.literal("blockquote"),
  get content() {
    return z.array(blockquoteContentNode).optional();
  },
});

export const expandNode = z.object({
  type: z.literal("expand"),
  get content() {
    return z.array(expandContentNode).optional();
  },
  attrs: z.object({
    title: z.string().optional(),
  }),
});

export const nestedExpandNode = z.object({
  type: z.literal("nestedExpand"),
  get content() {
    return z.array(nestedExpandContentNode).optional();
  },
  attrs: z
    .object({
      title: z.string().optional(),
    })
    .optional(),
});

export const ruleNode = z.object({
  type: z.literal("rule"),
});

export const panelNode = z.object({
  type: z.literal("panel"),
  get content() {
    return z.array(panelContentNode).optional();
  },
  attrs: z.object({
    panelType: z.enum(["info", "note", "warning", "success", "error"]),
  }),
});

const cellAttrs = z
  .object({
    background: z.string().optional(),
    colspan: z.number().optional(),
    colwidth: z.array(z.number()).optional(),
    rowspan: z.number().optional(),
  })
  .optional();

export const tableCellNode = z.object({
  type: z.literal("tableCell"),
  attrs: cellAttrs,
  get content() {
    return z.array(tableCellContentNode).optional();
  },
});

export const tableHeaderNode = z.object({
  type: z.literal("tableHeader"),
  attrs: cellAttrs,
  get content() {
    return z.array(tableCellContentNode).optional();
  },
});
export type TableCellNode =
  | z.infer<typeof tableCellNode>
  | z.infer<typeof tableHeaderNode>;

export const tableRowNode = z.object({
  type: z.literal("tableRow"),
  content: z
    .array(z.discriminatedUnion("type", [tableCellNode, tableHeaderNode]))
    .optional(),
});
export type TableRowNode = z.infer<typeof tableRowNode>;

export const tableNode = z.object({
  type: z.literal("table"),
  content: z.array(tableRowNode).optional(),
  attrs: z
    .object({
      isNumberColumnEnabled: z.boolean().optional(),
      width: z.number().optional(),
      layout: z.string().optional(),
      displayMode: z.enum(["default", "fixed"]).optional(),
    })
    .optional(),
});

const taskState = z.enum(["TODO", "DONE"]);

export const taskItemNode = z.object({
  type: z.literal("taskItem"),
  content: z.array(inlineNode).optional(),
  attrs: z
    .object({ localId: z.string().optional(), state: taskState.optional() })
    .optional(),
});

export const blockTaskItemNode = z.object({
  type: z.literal("blockTaskItem"),
  get content() {
    return z
      .array(z.discriminatedUnion("type", [paragraphNode, extensionNode]))
      .optional();
  },
  attrs: z
    .object({ localId: z.string().optional(), state: taskState.optional() })
    .optional(),
});

export const taskListNode = z.object({
  type: z.literal("taskList"),
  get content() {
    return z
      .array(
        z.discriminatedUnion("type", [
          taskItemNode,
          taskListNode,
          blockTaskItemNode,
        ]),
      )
      .optional();
  },
  attrs: z.object({ localId: z.string().optional() }).optional(),
});

export const decisionItemNode = z.object({
  type: z.literal("decisionItem"),
  content: z.array(inlineNode).optional(),
  attrs: z
    .object({ localId: z.string().optional(), state: z.string().optional() })
    .optional(),
});

export const decisionListNode = z.object({
  type: z.literal("decisionList"),
  content: z.array(decisionItemNode).optional(),
  attrs: z.object({ localId: z.string().optional() }).optional(),
});

const mediaLayout = z.enum([
  "wide",
  "full-width",
  "center",
  "wrap-right",
  "wrap-left",
  "align-end",
  "align-start",
]);

export const blockCardNode = z.object({
  type: z.literal("blockCard"),
  attrs: z
    .object({
      url: z.string().optional(),
      data: z.unknown().optional(),
      datasource: z.unknown().optional(),
      localId: z.string().optional(),
    })
    .optional(),
});

export const embedCardNode = z.object({
  type: z.literal("embedCard"),
  attrs: z
    .object({
      url: z.string().optional(),
      layout: mediaLayout.optional(),
      width: z.number().optional(),
      originalHeight: z.number().optional(),
      originalWidth: z.number().optional(),
      localId: z.string().optional(),
    })
    .optional(),
});

const extensionAttrs = z
  .object({
    extensionKey: z.string().optional(),
    extensionType: z.string().optional(),
    parameters: z.unknown().optional(),
    text: z.string().optional(),
    layout: z.string().optional(),
    localId: z.string().optional(),
  })
  .optional();

export const extensionNode = z.object({
  type: z.literal("extension"),
  attrs: extensionAttrs,
});

export const bodiedExtensionNode = z.object({
  type: z.literal("bodiedExtension"),
  attrs: extensionAttrs,
  get content() {
    return z.array(nonNestableBlockNode).optional();
  },
});

export const extensionFrameNode = z.object({
  type: z.literal("extensionFrame"),
  get content() {
    return z.array(extensionFrameContentNode).optional();
  },
});

export const multiBodiedExtensionNode = z.object({
  type: z.literal("multiBodiedExtension"),
  attrs: extensionAttrs,
  content: z.array(extensionFrameNode).optional(),
});

const syncBlockAttrs = z
  .object({
    resourceId: z.string().optional(),
    localId: z.string().optional(),
  })
  .optional();

export const syncBlockNode = z.object({
  type: z.literal("syncBlock"),
  attrs: syncBlockAttrs,
});

export const bodiedSyncBlockNode = z.object({
  type: z.literal("bodiedSyncBlock"),
  attrs: syncBlockAttrs,
  get content() {
    return z.array(bodiedSyncBlockContentNode).optional();
  },
});

export const mediaNode = z.object({
  type: z.literal("media"),
  attrs: z
    .object({
      type: z.enum(["file", "link", "external"]).optional(),
      id: z.string().optional(),
      collection: z.string().optional(),
      url: z.string().optional(),
      alt: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      localId: z.string().optional(),
      occurrenceKey: z.string().optional(),
    })
    .optional(),
});
export type MediaNode = z.infer<typeof mediaNode>;

export const captionNode = z.object({
  type: z.literal("caption"),
  content: z.array(inlineNode).optional(),
});

export const mediaSingleNode = z.object({
  type: z.literal("mediaSingle"),
  content: z
    .array(z.discriminatedUnion("type", [mediaNode, captionNode]))
    .optional(),
  attrs: z
    .object({
      layout: mediaLayout.optional(),
      width: z.number().optional(),
      widthType: z.enum(["percentage", "pixel"]).optional(),
    })
    .optional(),
});

export const mediaGroupNode = z.object({
  type: z.literal("mediaGroup"),
  content: z.array(mediaNode).optional(),
});

export const listItemContentNode = z.discriminatedUnion("type", [
  paragraphNode,
  bulletListNode,
  orderedListNode,
  taskListNode,
  mediaSingleNode,
  codeBlockNode,
  extensionNode,
]);

export const blockquoteContentNode = z.discriminatedUnion("type", [
  paragraphNode,
  orderedListNode,
  bulletListNode,
  codeBlockNode,
  mediaSingleNode,
  mediaGroupNode,
  extensionNode,
]);

export const panelContentNode = z.discriminatedUnion("type", [
  paragraphNode,
  headingNode,
  bulletListNode,
  orderedListNode,
  blockCardNode,
  mediaGroupNode,
  mediaSingleNode,
  codeBlockNode,
  taskListNode,
  ruleNode,
  decisionListNode,
  extensionNode,
]);

export const nonNestableBlockNode = z.discriminatedUnion("type", [
  paragraphNode,
  panelNode,
  blockquoteNode,
  orderedListNode,
  bulletListNode,
  ruleNode,
  headingNode,
  codeBlockNode,
  mediaGroupNode,
  mediaSingleNode,
  decisionListNode,
  taskListNode,
  tableNode,
  blockCardNode,
  embedCardNode,
  extensionNode,
]);

export const expandContentNode = z.discriminatedUnion("type", [
  ...nonNestableBlockNode.options,
  nestedExpandNode,
  multiBodiedExtensionNode,
  extensionFrameNode,
]);

export const nestedExpandContentNode = z.discriminatedUnion("type", [
  paragraphNode,
  headingNode,
  mediaSingleNode,
  mediaGroupNode,
  codeBlockNode,
  bulletListNode,
  orderedListNode,
  taskListNode,
  decisionListNode,
  ruleNode,
  panelNode,
  blockquoteNode,
  extensionNode,
]);

export const tableCellContentNode = z.discriminatedUnion("type", [
  paragraphNode,
  panelNode,
  blockquoteNode,
  orderedListNode,
  bulletListNode,
  ruleNode,
  headingNode,
  codeBlockNode,
  mediaSingleNode,
  mediaGroupNode,
  decisionListNode,
  taskListNode,
  blockCardNode,
  embedCardNode,
  extensionNode,
  nestedExpandNode,
]);

export const extensionFrameContentNode = z.discriminatedUnion("type", [
  ...nonNestableBlockNode.options,
  bodiedExtensionNode,
]);

export const bodiedSyncBlockContentNode = z.discriminatedUnion("type", [
  paragraphNode,
  blockCardNode,
  blockquoteNode,
  bulletListNode,
  codeBlockNode,
  decisionListNode,
  embedCardNode,
  expandNode,
  headingNode,
  mediaGroupNode,
  mediaSingleNode,
  orderedListNode,
  panelNode,
  ruleNode,
  tableNode,
  taskListNode,
]);

export const topLevelBlockNode = z.discriminatedUnion("type", [
  blockCardNode,
  blockquoteNode,
  bodiedExtensionNode,
  bodiedSyncBlockNode,
  bulletListNode,
  codeBlockNode,
  decisionListNode,
  embedCardNode,
  expandNode,
  extensionNode,
  headingNode,
  mediaGroupNode,
  mediaSingleNode,
  multiBodiedExtensionNode,
  orderedListNode,
  panelNode,
  paragraphNode,
  ruleNode,
  syncBlockNode,
  tableNode,
  taskListNode,
]);

/** Every node the `BlockNode` dispatcher renders, at any depth. */
export const blockNode = z.discriminatedUnion("type", [
  ...topLevelBlockNode.options,
  nestedExpandNode,
  extensionFrameNode,
]);
export type BlockNode = z.infer<typeof blockNode>;
