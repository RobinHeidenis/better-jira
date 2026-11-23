import type z from "zod";
import type { textNode } from "#/lib/adf/inline-nodes";

// TODO: support marks
export const TextNode = ({ node }: { node: z.infer<typeof textNode> }) => {
  return <span>{node.text}</span>;
};
