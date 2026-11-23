import type z from "zod";
import type { blockNode } from "#/lib/adf/block-nodes";
import { BlockNode } from "./block-nodes/block-node";

export const Adf = ({ content }: { content: z.infer<typeof blockNode>[] }) => {
  return (
    <div className="overflow-y-scroll">
      {content.map((node, index) =>
        node ? <BlockNode key={index} node={node} /> : null,
      )}
    </div>
  );
};
