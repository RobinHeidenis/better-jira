import type z from "zod";
import { Badge } from "#/components/ui/badge";
import type { inlineCardNode } from "#/lib/adf/inline-nodes";
import { safeUrl } from "#/lib/adf/sanitize";

export const InlineCardNode = ({
  node,
}: {
  node: z.infer<typeof inlineCardNode>;
}) => {
  const href = safeUrl(node.attrs?.url);
  if (!href) return <span>{String(node.attrs?.url ?? "")}</span>;
  const { hostname } = new URL(href);
  return (
    <Badge
      variant="outline"
      className="max-w-full align-middle"
      render={
        <a href={href} target="_blank" rel="noreferrer" title={href}>
          <img
            alt=""
            className="-ml-1"
            src={`https://icons.duckduckgo.com/ip3/${hostname}.ico`}
            width={12}
          />
          <span className="truncate">{hostname.replace(/^www\./, "")}</span>
        </a>
      }
    />
  );
};
