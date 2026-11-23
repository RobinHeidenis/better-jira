import { Skeleton } from "#/components/ui/skeleton";
import type { MediaInlineNode as MediaInlineNodeType } from "#/lib/adf/inline-nodes";
import { AttachmentDownloadChip, JiraFileChip } from "../media";
import { useMediaAttachment } from "../use-media-attachment";

export const MediaInlineNode = ({ node }: { node: MediaInlineNodeType }) => {
  const { attachment, isPending } = useMediaAttachment(node.attrs);
  if (isPending)
    return <Skeleton className="inline-block h-5 w-24 align-middle" />;
  if (attachment) return <AttachmentDownloadChip attachment={attachment} />;
  const alt = node.attrs?.alt;
  return (
    <JiraFileChip name={typeof alt === "string" && alt ? alt : "Attachment"} />
  );
};
