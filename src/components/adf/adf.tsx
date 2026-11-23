import type { BlockNode as BlockNodeType } from "#/lib/adf/block-nodes";
import { BlockNode } from "./block-nodes/block-node";
import { AdfErrorBoundary } from "./unsupported";

export const Adf = ({ content }: { content: BlockNodeType[] }) => {
  return (
    <div className="overflow-y-scroll">
      {(Array.isArray(content) ? content : []).map((node, index) =>
        node ? (
          <AdfErrorBoundary key={index} type={node.type}>
            <BlockNode node={node} />
          </AdfErrorBoundary>
        ) : null,
      )}
    </div>
  );
};
