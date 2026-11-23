import type z from "zod";
import type { orderedListNode } from "#/lib/adf/block-nodes";
import { ListItemNode } from "./list-item";

export const OrderedListNode = ({
  node,
}: {
  node: z.infer<typeof orderedListNode>;
}) => {
  return (
    <ol
      className="my-2 ml-5 list-decimal [&>li]:mt-2"
      start={node.attrs?.order ?? 1}
    >
      {node.content?.map((child, index) =>
        child ? <ListItemNode key={index} node={child} /> : null,
      )}
    </ol>
  );
};
