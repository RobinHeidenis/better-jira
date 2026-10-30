import type z from "zod";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
} from "#/components/ui/code-block";
import type { codeBlockNode } from "#/lib/adf/block-nodes";

export const CodeBlockNode = ({
  node,
}: {
  node: z.infer<typeof codeBlockNode>;
}) => {
  const textContent =
    node.content?.map((child) => child.text ?? "").join("") ?? "";
  return (
    <div className="w-full max-w-md">
      <CodeBlock size="sm" className="w-full">
        <CodeBlockActions>
          <CodeBlockCopyButton value={textContent} />
        </CodeBlockActions>
        <CodeBlockContent
          lineNumbers={node.attrs.hideLineNumbers !== false}
          wrap={node.attrs.wrap ?? false}
        >
          {textContent}
        </CodeBlockContent>
      </CodeBlock>
    </div>
  );
};
