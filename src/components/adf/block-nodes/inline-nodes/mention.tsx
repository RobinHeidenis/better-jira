import type z from "zod";
import { Badge } from "#/components/ui/badge";
import type { mentionNode } from "#/lib/adf/inline-nodes";

export const MentionNode = ({
  node,
}: {
  node: z.infer<typeof mentionNode>;
}) => {
  return (
    <Badge variant="outline" className="bg-blue-950 text-blue-300">
      {node.attrs.text ?? node.attrs.id}
    </Badge>
  );
};
