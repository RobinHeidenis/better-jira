import type { BlockNode as BlockNodeType } from "#/lib/adf/block-nodes";
import { UnsupportedBlock } from "../unsupported";
import { BlockquoteNode } from "./blockquote";
import { BulletListNode } from "./bullet-list";
import { CodeBlockNode } from "./code-block";
import { ExpandNode } from "./expand";
import { HeadingNode } from "./heading";
import { OrderedListNode } from "./ordered-list";
import { PanelNode } from "./panel";
import { ParagraphNode } from "./paragraph";
import { TableNode } from "./table";

export const BlockNode = ({ node }: { node: BlockNodeType }) => {
  switch (node.type) {
    case "blockquote":
      return <BlockquoteNode node={node} />;
    case "bulletList":
      return <BulletListNode node={node} />;
    case "codeBlock":
      return <CodeBlockNode node={node} />;
    case "expand":
      return <ExpandNode node={node} />;
    case "heading":
      return <HeadingNode node={node} />;
    case "orderedList":
      return <OrderedListNode node={node} />;
    case "panel":
      return <PanelNode node={node} />;
    case "paragraph":
      return <ParagraphNode node={node} />;
    case "rule":
      return <hr className="my-5 text-stone-500" />;
    case "table":
      return <TableNode node={node} />;
  }
  return <UnsupportedBlock type={node.type} />;
};
