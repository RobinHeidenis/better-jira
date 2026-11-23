import type z from "zod";
import type { blockNode } from "#/lib/adf/block-nodes";
import { blockNodeTypes } from "#/lib/adf/block-nodes";
import { HeadingNode } from "../heading";
import { ParagraphNode } from "../paragraph";
import { BlockquoteNode } from "./blockquote";
import { BulletListNode } from "./bullet-list";
import { CodeBlockNode } from "./code-block";
import { ExpandNode } from "./expand";
import { OrderedListNode } from "./ordered-list";
import { PanelNode } from "./panel";

export const BlockNode = ({ node }: { node: z.infer<typeof blockNode> }) => {
  switch (node.type) {
    case blockNodeTypes.enum.blockquote:
      return <BlockquoteNode node={node} />;
    // bodiedSyncBlock (can't find docs on it)
    case blockNodeTypes.enum.bulletList:
      return <BulletListNode node={node} />;
    case blockNodeTypes.enum.codeBlock:
      return <CodeBlockNode node={node} />;
    case blockNodeTypes.enum.expand:
      return <ExpandNode node={node} />;
    case blockNodeTypes.enum.heading:
      return <HeadingNode node={node} />;
    // mediaGroup
    // mediaSingle
    case blockNodeTypes.enum.orderedList:
      return <OrderedListNode node={node} />;
    case blockNodeTypes.enum.panel:
      return <PanelNode node={node} />;
    // panel
    case blockNodeTypes.enum.paragraph:
      return <ParagraphNode node={node} />;
    case blockNodeTypes.enum.rule:
      return <hr className="my-5 text-stone-500" />;
    // syncBlock
    // table
    // multiBodiedExtension
  }
  // @ts-expect-error
  return <div>{node.type}</div>;
};
