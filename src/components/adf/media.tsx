import {
  RiAttachment2,
  RiDownload2Line,
  RiExternalLinkLine,
} from "@remixicon/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { type ComponentProps, type CSSProperties, useState } from "react";
import { Badge } from "#/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Skeleton } from "#/components/ui/skeleton";
import type { MediaNode } from "#/lib/adf/block-nodes";
import { safeUrl } from "#/lib/adf/sanitize";
import {
  type Attachment,
  attachmentBlob,
  attachmentContentOptions,
  attachmentDataUrl,
  attachmentUrlOptions,
  findAttachment,
  formatFileSize,
} from "#/lib/api/attachments";
import { jiraIssueUrl } from "#/lib/jira-url";
import { store } from "#/lib/store";
import { cn } from "#/lib/utils";
import { useAdfContext } from "./adf-context";
import { UnsupportedInline } from "./unsupported";

type MediaAttrs = NonNullable<MediaNode["attrs"]>;
export type MediaDisplay = "single" | "thumbnail";

const displayName = (alt: unknown) =>
  typeof alt === "string" && alt ? alt : "Attachment";

/**
 * Media nodes carry a media-services id, not the Jira attachment id, so when
 * the filename doesn't pick out exactly one attachment the best we can do is
 * point at the issue in Jira.
 */
export const JiraFileChip = ({ name }: { name: string }) => {
  const baseUrl = useSelector(store, (state) => state.baseUrl);
  const { issueKey } = useAdfContext();
  const href =
    baseUrl && issueKey ? safeUrl(jiraIssueUrl(baseUrl, issueKey)) : null;

  const label = (
    <>
      <RiAttachment2 aria-hidden />
      <span className="max-w-64 truncate">{name}</span>
    </>
  );

  if (!href) {
    return (
      <Badge variant="outline" className="align-middle">
        {label}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="align-middle"
      render={
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          title="Open the issue in Jira to view this attachment"
        >
          {label}
          <RiExternalLinkLine aria-hidden className="text-muted-foreground" />
        </a>
      }
    />
  );
};

export const AttachmentDownloadChip = ({
  attachment,
}: {
  attachment: Attachment;
}) => {
  const queryClient = useQueryClient();
  const [state, setState] = useState<"idle" | "pending" | "failed">("idle");

  if (state === "failed") return <JiraFileChip name={attachment.filename} />;

  const download = async () => {
    setState("pending");
    try {
      const content = await queryClient.fetchQuery(
        attachmentContentOptions(attachment.id),
      );
      const url = URL.createObjectURL(attachmentBlob(content));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = attachment.filename;
      anchor.click();
      // Revoking straight away can cancel the download in some browsers.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setState("idle");
    } catch {
      setState("failed");
    }
  };

  return (
    <Badge
      variant="outline"
      className="align-middle"
      render={
        <button
          type="button"
          onClick={download}
          disabled={state === "pending"}
          title={`Download ${attachment.filename}`}
        >
          <RiDownload2Line aria-hidden />
          <span className="max-w-64 truncate">{attachment.filename}</span>
          <span className="text-muted-foreground">
            {formatFileSize(attachment.size)}
          </span>
        </button>
      }
    />
  );
};

const aspectRatio = (attrs: MediaAttrs | undefined): CSSProperties => {
  const width = attrs?.width;
  const height = attrs?.height;
  return typeof width === "number" &&
    typeof height === "number" &&
    width > 0 &&
    height > 0
    ? { aspectRatio: `${width} / ${height}` }
    : {};
};

const imageClass = (display: MediaDisplay) =>
  display === "single"
    ? "block h-auto w-full rounded-md"
    : "h-24 w-auto max-w-48 rounded-md object-cover";

const ZoomableImage = ({
  display,
  alt,
  ...props
}: ComponentProps<"img"> & { display: MediaDisplay }) => (
  <Dialog>
    <DialogTrigger
      className={cn(
        "cursor-zoom-in rounded-md",
        display === "single" ? "block w-full" : "inline-block",
      )}
      aria-label={alt ? `View ${alt} larger` : "View image larger"}
    >
      <img alt={alt} {...props} className={imageClass(display)} />
    </DialogTrigger>
    <DialogContent className="w-auto max-w-[95vw] bg-transparent p-0 ring-0 sm:max-w-[95vw]">
      <DialogTitle className="sr-only">{alt || "Image"}</DialogTitle>
      <img
        alt={alt}
        {...props}
        className="max-h-[90vh] max-w-[95vw] rounded-md object-contain"
      />
    </DialogContent>
  </Dialog>
);

const AttachmentImage = ({
  attachment,
  attrs,
  display,
}: {
  attachment: Attachment;
  attrs: MediaAttrs | undefined;
  display: MediaDisplay;
}) => {
  const { data, isPending, isError } = useQuery(
    attachmentContentOptions(attachment.id),
  );

  if (isPending) {
    if (display === "thumbnail") return <Skeleton className="h-24 w-32" />;
    const ratio = aspectRatio(attrs);
    return (
      <div className={cn("w-full", !ratio.aspectRatio && "h-48")} style={ratio}>
        <Skeleton className="size-full" />
      </div>
    );
  }
  if (isError || !data) return <JiraFileChip name={attachment.filename} />;

  return (
    <ZoomableImage
      src={attachmentDataUrl(data)}
      alt={attachment.filename}
      title={attachment.filename}
      display={display}
    />
  );
};

const AttachmentVideo = ({
  attachment,
  attrs,
  display,
}: {
  attachment: Attachment;
  attrs: MediaAttrs | undefined;
  display: MediaDisplay;
}) => {
  const { data, isPending, isError } = useQuery(
    attachmentUrlOptions(attachment.id),
  );

  if (isPending) {
    if (display === "thumbnail") return <Skeleton className="h-24 w-32" />;
    const ratio = aspectRatio(attrs);
    return (
      <div className={cn("w-full", !ratio.aspectRatio && "h-48")} style={ratio}>
        <Skeleton className="size-full" />
      </div>
    );
  }
  if (isError || !data) return <JiraFileChip name={attachment.filename} />;

  return (
    // biome-ignore lint/a11y/useMediaCaption: Jira attachments have no caption tracks.
    <video
      src={data.url}
      controls
      preload="metadata"
      title={attachment.filename}
      className={
        display === "single"
          ? "block h-auto w-full rounded-md bg-black"
          : "h-24 w-auto max-w-48 rounded-md bg-black"
      }
    />
  );
};

export const MediaItem = ({
  node,
  display,
}: {
  node: MediaNode;
  display: MediaDisplay;
}) => {
  const { attachments } = useAdfContext();
  const attrs = node.attrs;

  if (attrs?.type === "external") {
    const src = safeUrl(attrs.url);
    if (!src) return <UnsupportedInline type="media" />;
    return (
      <ZoomableImage
        src={src}
        alt={attrs.alt ?? ""}
        referrerPolicy="no-referrer"
        display={display}
      />
    );
  }

  const attachment = findAttachment(attachments, attrs?.alt);
  if (!attachment) return <JiraFileChip name={displayName(attrs?.alt)} />;
  if (attachment.mimeType.startsWith("image/")) {
    return (
      <AttachmentImage
        attachment={attachment}
        attrs={attrs}
        display={display}
      />
    );
  }
  if (attachment.mimeType.startsWith("video/")) {
    return (
      <AttachmentVideo
        attachment={attachment}
        attrs={attrs}
        display={display}
      />
    );
  }
  return <AttachmentDownloadChip attachment={attachment} />;
};
