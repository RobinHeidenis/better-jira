import type { MediaInlineNode as MediaInlineNodeType } from "#/lib/adf/inline-nodes";
import { findAttachment } from "#/lib/api/attachments";
import { useAdfContext } from "../adf-context";
import { AttachmentDownloadChip, JiraFileChip } from "../media";

export const MediaInlineNode = ({ node }: { node: MediaInlineNodeType }) => {
  const { attachments } = useAdfContext();
  const alt = node.attrs?.alt;
  const attachment = findAttachment(attachments, alt);
  if (attachment) return <AttachmentDownloadChip attachment={attachment} />;
  return (
    <JiraFileChip name={typeof alt === "string" && alt ? alt : "Attachment"} />
  );
};
