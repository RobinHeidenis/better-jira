import type { HeadingNode as HeadingNodeType } from "#/lib/adf/block-nodes";
import { InlineNode } from "./inline-nodes/inline-node";

export const HeadingNode = ({ node }: { node: HeadingNodeType }) => {
  const content = node.content?.map((child, index) => (
    <InlineNode key={index} node={child} />
  ));
  switch (node.attrs.level) {
    case 1:
      return <h1 className="text-xl/relaxed font-bold">{content}</h1>;
    case 2:
      return <h2 className="text-lg/relaxed font-bold">{content}</h2>;
    case 3:
      return <h3 className="text-base/relaxed font-bold">{content}</h3>;
    case 4:
      return <h4 className="text-md/relaxed font-bold">{content}</h4>;
    case 5:
      return <h5 className="text-sm/relaxed font-bold">{content}</h5>;
    case 6:
      return <h6 className="text-xs/relaxed font-bold">{content}</h6>;
    default:
      return <h2>{content}</h2>;
  }
};
