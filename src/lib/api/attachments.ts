import { type QueryKey, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { store } from "../store";
import { jiraAttachmentContent, jiraAttachmentUrl } from "./api.functions";

export const attachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number(),
});
export type Attachment = z.infer<typeof attachmentSchema>;

const ATTACHMENT_CONTENT_KEY = "attachment-content";
const ATTACHMENT_URL_KEY = "attachment-url";

export const getAttachmentContent = async (attachmentId: string) => {
  const { apiToken, baseUrl } = store.get();
  if (!apiToken || !baseUrl) {
    throw new Error("Jira is not configured yet — finish setup first.");
  }
  return jiraAttachmentContent({ data: { baseUrl, apiToken, attachmentId } });
};

export const attachmentContentOptions = (attachmentId: string) => {
  return queryOptions({
    queryKey: [ATTACHMENT_CONTENT_KEY, attachmentId],
    queryFn: () => getAttachmentContent(attachmentId),
    // An attachment's bytes never change, but they're heavy to keep around.
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
};

export const attachmentUrlOptions = (attachmentId: string) => {
  return queryOptions({
    queryKey: [ATTACHMENT_URL_KEY, attachmentId],
    queryFn: () => {
      const { apiToken, baseUrl } = store.get();
      if (!apiToken || !baseUrl) {
        throw new Error("Jira is not configured yet — finish setup first.");
      }
      return jiraAttachmentUrl({ data: { baseUrl, apiToken, attachmentId } });
    },
    // The signed URL expires, so don't hand out an old one to a fresh mount.
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
};

/**
 * Attachment bytes would quickly fill the localStorage quota, and signed URLs
 * expire long before a persisted cache would be restored.
 */
export const isAttachmentContentQuery = (queryKey: QueryKey) =>
  queryKey[0] === ATTACHMENT_CONTENT_KEY || queryKey[0] === ATTACHMENT_URL_KEY;

export const attachmentDataUrl = (content: {
  mimeType: string;
  base64: string;
}) => `data:${content.mimeType};base64,${content.base64}`;

export const attachmentBlob = (content: {
  mimeType: string;
  base64: string;
}) => {
  const binary = atob(content.base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: content.mimeType });
};

export const findAttachment = (
  attachments: readonly Attachment[],
  filename: unknown,
): Attachment | undefined => {
  if (typeof filename !== "string" || !filename) return undefined;
  const matches = attachments.filter(
    (attachment) => attachment.filename === filename,
  );
  return matches.length === 1 ? matches[0] : undefined;
};

const MEDIA_FILE_PATH = /\/file\/([0-9a-f-]{36})\//i;

/** The media-services file id inside a signed Jira attachment URL. */
export const mediaFileId = (url: string) => {
  try {
    return new URL(url).pathname.match(MEDIA_FILE_PATH)?.[1]?.toLowerCase();
  } catch {
    return undefined;
  }
};

export const formatFileSize = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
