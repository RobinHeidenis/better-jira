import { useQueries } from "@tanstack/react-query";
import {
  type Attachment,
  attachmentUrlOptions,
  findAttachment,
  mediaFileId,
} from "#/lib/api/attachments";
import { useAdfContext } from "./adf-context";

type MediaRef = { id?: unknown; alt?: unknown } | undefined;

/**
 * Media nodes don't carry the Jira attachment id. Match on filename first;
 * when that fails (media without `alt` is common), resolve each attachment's
 * signed URL, which embeds the media file id the node does carry.
 */
export const useMediaAttachment = (
  attrs: MediaRef,
): { attachment: Attachment | undefined; isPending: boolean } => {
  const { attachments } = useAdfContext();
  const byName = findAttachment(attachments, attrs?.alt);
  const mediaId =
    typeof attrs?.id === "string" && attrs.id ? attrs.id.toLowerCase() : null;
  const candidates = !byName && mediaId ? attachments : [];

  const urls = useQueries({
    queries: candidates.map((attachment) =>
      attachmentUrlOptions(attachment.id),
    ),
  });

  if (byName) return { attachment: byName, isPending: false };
  if (!mediaId) return { attachment: undefined, isPending: false };

  const index = urls.findIndex(
    (query) => query.data && mediaFileId(query.data.url) === mediaId,
  );
  if (index >= 0) return { attachment: candidates[index], isPending: false };
  return {
    attachment: undefined,
    isPending: urls.some((query) => query.isPending),
  };
};
