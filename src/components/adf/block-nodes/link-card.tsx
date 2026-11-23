import { RiExternalLinkLine } from "@remixicon/react";
import type z from "zod";
import type { blockCardNode, embedCardNode } from "#/lib/adf/block-nodes";
import { safeUrl } from "#/lib/adf/sanitize";
import { UnsupportedBlock } from "../unsupported";

const fromData = (data: unknown) => {
  if (typeof data !== "object" || data === null) return {};
  const record = data as Record<string, unknown>;
  return {
    url: record.url,
    name: typeof record.name === "string" ? record.name : undefined,
  };
};

export const LinkCardNode = ({
  node,
}: {
  node: z.infer<typeof blockCardNode> | z.infer<typeof embedCardNode>;
}) => {
  const data = fromData(
    node.attrs && "data" in node.attrs ? node.attrs.data : undefined,
  );
  const href = safeUrl(node.attrs?.url) ?? safeUrl(data.url);
  if (!href) return <UnsupportedBlock type={node.type} />;

  const { hostname } = new URL(href);
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="my-2 flex items-center gap-2 rounded-md border px-3 py-2 hover:bg-muted"
    >
      <img
        alt=""
        width={16}
        height={16}
        className="shrink-0"
        src={`https://icons.duckduckgo.com/ip3/${hostname}.ico`}
      />
      <span className="min-w-0 flex-1 truncate">{data.name ?? href}</span>
      <RiExternalLinkLine
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground"
      />
    </a>
  );
};
