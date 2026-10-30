import type z from "zod";
import type { bulletListNode } from "#/lib/adf/block-nodes";
import { ListItemNode } from "./list-item";

export const BulletListNode = ({
  node,
}: {
  node: z.infer<typeof bulletListNode>;
}) => {
  return (
    <ul className="my-2 ml-5 list-disc [&>li]:mt-2">
      {node.content?.map((child, index) =>
        child ? <ListItemNode key={index} node={child} /> : null,
      )}
    </ul>
  );
};
