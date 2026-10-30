import type z from "zod";
import type { emojiNode } from "#/lib/adf/inline-nodes";

export const EmojiNode = ({ node }: { node: z.infer<typeof emojiNode> }) => {
  if (node.attrs.text) {
    return <span>{node.attrs.text}</span>;
  }

  return <code>{node.attrs.shortName}</code>;
};
