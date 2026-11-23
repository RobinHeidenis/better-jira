import type { InlineNode as InlineNodeType } from "#/lib/adf/inline-nodes";
import { UnsupportedInline } from "../unsupported";
import { DateNode } from "./date";
import { EmojiNode } from "./emoji";
import { InlineCardNode } from "./inline-card";
import { MentionNode } from "./mention";
import { StatusNode } from "./status";
import { TextNode } from "./text";

export const InlineNode = ({ node }: { node: InlineNodeType }) => {
  switch (node.type) {
    case "date":
      return <DateNode node={node} />;
    case "emoji":
      return <EmojiNode node={node} />;
    case "hardBreak":
      return <br />;
    case "inlineCard":
      return <InlineCardNode node={node} />;
    case "mention":
      return <MentionNode node={node} />;
    case "placeholder":
      return (
        <span className="text-muted-foreground italic">{node.attrs?.text}</span>
      );
    case "status":
      return <StatusNode node={node} />;
    case "text":
      return <TextNode node={node} />;
  }
  return <UnsupportedInline type={node.type} />;
};
