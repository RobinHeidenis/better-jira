import type z from "zod";
import { type inlineNode, inlineNodeTypes } from "#/lib/adf/inline-nodes";
import { DateNode } from "./date";
import { EmojiNode } from "./emoji";
import { InlineCardNode } from "./inline-card";
import { MentionNode } from "./mention";
import { StatusNode } from "./status";
import { TextNode } from "./text";

export const InlineNode = ({ node }: { node: z.infer<typeof inlineNode> }) => {
  switch (node.type) {
    case inlineNodeTypes.enum.date:
      return <DateNode node={node} />;
    case inlineNodeTypes.enum.emoji:
      return <EmojiNode node={node} />;
    case inlineNodeTypes.enum.hardBreak:
      return <br />;
    case inlineNodeTypes.enum.inlineCard:
      return <InlineCardNode node={node} />;
    case inlineNodeTypes.enum.mention:
      return <MentionNode node={node} />;
    case inlineNodeTypes.enum.status:
      return <StatusNode node={node} />;
    case inlineNodeTypes.enum.text:
      return <TextNode node={node} />;
    default:
      // @ts-expect-error
      return <span>{node.type}</span>;
  }
};
