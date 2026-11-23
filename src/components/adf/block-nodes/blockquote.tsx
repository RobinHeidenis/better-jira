import type z from "zod";
import type { blockquoteNode } from "#/lib/adf/block-nodes";
import { BlockNode } from "./block-node";

export const BlockquoteNode = ({
  node,
}: {
  node: z.infer<typeof blockquoteNode>;
}) => {
  return (
    <blockquote className="border-l border-l-2 border-l-stone-600 pl-3">
      {node.content?.map((child, index) =>
        child ? <BlockNode key={index} node={child} /> : null,
      )}
    </blockquote>
  );
};
