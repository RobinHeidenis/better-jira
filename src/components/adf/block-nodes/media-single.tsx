import type { CSSProperties } from "react";
import type z from "zod";
import type { mediaSingleNode } from "#/lib/adf/block-nodes";
import { cn } from "#/lib/utils";
import { InlineNode } from "../inline-nodes/inline-node";
import { MediaItem } from "../media";
import { UnsupportedBlock } from "../unsupported";

const alignment = (layout: unknown) => {
  switch (layout) {
    case "align-start":
    case "wrap-left":
      return "mr-auto";
    case "align-end":
    case "wrap-right":
      return "ml-auto";
    default:
      return "mx-auto";
  }
};

const sizing = (
  attrs: z.infer<typeof mediaSingleNode>["attrs"],
  mediaWidth: unknown,
): CSSProperties => {
  if (attrs?.layout === "wide" || attrs?.layout === "full-width") return {};
  const width = attrs?.width;
  if (typeof width === "number" && width > 0) {
    return attrs?.widthType === "pixel"
      ? { width: `${width}px`, maxWidth: "100%" }
      : { width: `${Math.min(width, 100)}%` };
  }
  if (typeof mediaWidth === "number" && mediaWidth > 0) {
    return { width: `${mediaWidth}px`, maxWidth: "100%" };
  }
  return {};
};

export const MediaSingleNode = ({
  node,
}: {
  node: z.infer<typeof mediaSingleNode>;
}) => {
  const media = node.content?.find((child) => child?.type === "media");
  const caption = node.content?.find((child) => child?.type === "caption");
  if (media?.type !== "media") return <UnsupportedBlock type={node.type} />;

  return (
    <figure
      className={cn("my-3 w-full", alignment(node.attrs?.layout))}
      style={sizing(node.attrs, media.attrs?.width)}
    >
      <MediaItem node={media} display="single" />
      {caption?.type === "caption" && caption.content?.length ? (
        <figcaption className="mt-1 text-center text-muted-foreground">
          {caption.content.map((child, index) =>
            child ? <InlineNode key={index} node={child} /> : null,
          )}
        </figcaption>
      ) : null}
    </figure>
  );
};
