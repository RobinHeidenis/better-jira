import type { ParagraphNode as ParagraphNodeType } from "#/lib/adf/block-nodes";
import { InlineNode } from "./inline-nodes/inline-node";

export const ParagraphNode = ({ node }: { node: ParagraphNodeType }) => {
  return (
    <p>
      {node.content?.map((child, index) => {
        return <InlineNode key={index} node={child} />;
      })}
    </p>
  );
};
