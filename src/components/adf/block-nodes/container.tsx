import type z from "zod";
import type {
  bodiedExtensionNode,
  bodiedSyncBlockNode,
  extensionFrameNode,
  extensionNode,
  multiBodiedExtensionNode,
  syncBlockNode,
} from "#/lib/adf/block-nodes";
import { UnsupportedBlock } from "../unsupported";
import { BlockNode } from "./block-node";

type ContainerNodeType =
  | z.infer<typeof extensionNode>
  | z.infer<typeof bodiedExtensionNode>
  | z.infer<typeof multiBodiedExtensionNode>
  | z.infer<typeof extensionFrameNode>
  | z.infer<typeof syncBlockNode>
  | z.infer<typeof bodiedSyncBlockNode>;

/** Extensions and sync blocks: only their body, if any, is renderable here. */
export const ContainerNode = ({ node }: { node: ContainerNodeType }) => {
  const content = "content" in node ? node.content : undefined;
  if (!Array.isArray(content) || content.length === 0) {
    return <UnsupportedBlock type={node.type} />;
  }
  return (
    <div>
      {content.map((child, index) =>
        child ? <BlockNode key={index} node={child} /> : null,
      )}
    </div>
  );
};
