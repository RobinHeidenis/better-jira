import type z from "zod";
import type { mediaGroupNode } from "#/lib/adf/block-nodes";
import { MediaItem } from "../media";

export const MediaGroupNode = ({
  node,
}: {
  node: z.infer<typeof mediaGroupNode>;
}) => {
  return (
    <div className="my-2 flex flex-wrap items-center gap-2">
      {node.content?.map((media, index) =>
        media?.type === "media" ? (
          <MediaItem key={index} node={media} display="thumbnail" />
        ) : null,
      )}
    </div>
  );
};
