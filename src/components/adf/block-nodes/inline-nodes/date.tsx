import type z from "zod";
import { Badge } from "#/components/ui/badge";
import type { dateNode } from "#/lib/adf/inline-nodes";

const intl = Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

export const DateNode = ({ node }: { node: z.infer<typeof dateNode> }) => {
  const formattedDate = intl.format(node.attrs.timestamp);

  return (
    <Badge
      variant="secondary"
      render={<time dateTime={formattedDate}>{formattedDate}</time>}
    />
  );
};
