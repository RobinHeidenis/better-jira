import type z from "zod";
import { Badge } from "#/components/ui/badge";
import type { inlineCardNode } from "#/lib/adf/inline-nodes";

export const InlineCardNode = ({
  node,
}: {
  node: z.infer<typeof inlineCardNode>;
}) => {
  const { hostname } = new URL(node.attrs.url);
  return (
    <Badge
      variant="outline"
      render={
        <a href={node.attrs.url}>
          <img
            alt=""
            className="-ml-1"
            src={`https://icons.duckduckgo.com/ip3/${hostname}.ico`}
            width={12}
          />
          {node.attrs.url}
        </a>
      }
    />
  );
};
