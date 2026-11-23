import type z from "zod";
import type { listItemNode } from "#/lib/adf/block-nodes";
import { BlockNode } from "./block-node";

export const ListItemNode = ({
  node,
}: {
  node: z.infer<typeof listItemNode>;
}) => {
  return (
    <li>
      {node.content?.map((child, index) =>
        child ? <BlockNode key={index} node={child} /> : null,
      )}
    </li>
  );
};
