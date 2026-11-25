import type z from "zod";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockLine,
} from "#/components/ui/code-block";
import { useHighlightedCode } from "#/hooks/use-highlighted-code";
import type { codeBlockNode } from "#/lib/adf/block-nodes";
import { isMermaid } from "#/lib/adf/mermaid";
import { MermaidDiagram } from "./mermaid-diagram";

const Code = ({
  text,
  language,
  lineNumbers,
  wrap,
}: {
  text: string;
  language: string;
  lineNumbers: boolean;
  wrap: boolean;
}) => {
  // Plain lines until the language loads, and for languages it doesn't know.
  const lines = useHighlightedCode(text, language);
  return (
    <div className="w-full">
      <CodeBlock size="sm" className="w-full">
        <CodeBlockActions>
          <CodeBlockCopyButton value={text} />
        </CodeBlockActions>
        <CodeBlockContent lineNumbers={lineNumbers} wrap={wrap}>
          {lines.map((line, index) => (
            <CodeBlockLine key={index}>{line}</CodeBlockLine>
          ))}
        </CodeBlockContent>
      </CodeBlock>
    </div>
  );
};

export const CodeBlockNode = ({
  node,
}: {
  node: z.infer<typeof codeBlockNode>;
}) => {
  const textContent =
    node.content?.map((child) => child.text ?? "").join("") ?? "";

  const code = (
    <Code
      text={textContent}
      language={node.attrs?.language ?? ""}
      lineNumbers={!node.attrs?.hideLineNumbers}
      wrap={node.attrs?.wrap ?? false}
    />
  );

  if (isMermaid(node.attrs?.language ?? undefined, textContent)) {
    return <MermaidDiagram source={textContent} fallback={code} />;
  }

  return code;
};
