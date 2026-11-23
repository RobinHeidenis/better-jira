import type { BlockNode as BlockNodeType } from "#/lib/adf/block-nodes";
import { UnsupportedBlock } from "../unsupported";
import { BlockquoteNode } from "./blockquote";
import { BulletListNode } from "./bullet-list";
import { CodeBlockNode } from "./code-block";
import { ContainerNode } from "./container";
import { DecisionListNode } from "./decision-list";
import { ExpandNode } from "./expand";
import { HeadingNode } from "./heading";
import { LinkCardNode } from "./link-card";
import { MediaGroupNode } from "./media-group";
import { MediaSingleNode } from "./media-single";
import { OrderedListNode } from "./ordered-list";
import { PanelNode } from "./panel";
import { ParagraphNode } from "./paragraph";
import { TableNode } from "./table";
import { TaskListNode } from "./task-list";

export const BlockNode = ({ node }: { node: BlockNodeType }) => {
  switch (node.type) {
    case "blockquote":
      return <BlockquoteNode node={node} />;
    case "bulletList":
      return <BulletListNode node={node} />;
    case "codeBlock":
      return <CodeBlockNode node={node} />;
    case "expand":
    case "nestedExpand":
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
    case "taskList":
      return <TaskListNode node={node} />;
    case "decisionList":
      return <DecisionListNode node={node} />;
    case "mediaSingle":
      return <MediaSingleNode node={node} />;
    case "mediaGroup":
      return <MediaGroupNode node={node} />;
    case "blockCard":
    case "embedCard":
      return <LinkCardNode node={node} />;
    case "extension":
    case "bodiedExtension":
    case "multiBodiedExtension":
    case "extensionFrame":
    case "syncBlock":
    case "bodiedSyncBlock":
      return <ContainerNode node={node} />;
  }
  // Exhaustive by type, but the data is unvalidated and may hold anything.
  return <UnsupportedBlock type={(node as { type?: unknown }).type} />;
};
