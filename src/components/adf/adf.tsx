import type { BlockNode as BlockNodeType } from "#/lib/adf/block-nodes";
import type { Attachment } from "#/lib/api/attachments";
import { AdfContext } from "./adf-context";
import { BlockNode } from "./block-nodes/block-node";
import { AdfErrorBoundary } from "./unsupported";

export const Adf = ({
  content,
  attachments,
  issueKey,
}: {
  content: BlockNodeType[];
  attachments?: readonly Attachment[] | null;
  issueKey?: string;
}) => {
  return (
    <AdfContext value={{ attachments: attachments ?? [], issueKey }}>
      <div className="overflow-y-scroll">
        {(Array.isArray(content) ? content : []).map((node, index) =>
          node ? (
            <AdfErrorBoundary key={index} type={node.type}>
              <BlockNode node={node} />
            </AdfErrorBoundary>
          ) : null,
        )}
      </div>
    </AdfContext>
  );
};
