import type { CSSProperties, ReactNode } from "react";
import type {
  TextMark,
  TextNode as TextNodeType,
} from "#/lib/adf/inline-nodes";
import { safeColor, safeUrl } from "#/lib/adf/sanitize";

const LINK_PROTOCOLS = ["http:", "https:", "mailto:"];

export const TextNode = ({ node }: { node: TextNodeType }) => {
  const marks: TextMark[] = Array.isArray(node.marks) ? node.marks : [];
  let content: ReactNode = node.text;
  const style: CSSProperties = {};
  let link: Extract<TextMark, { type: "link" }> | undefined;

  for (const mark of marks) {
    switch (mark?.type) {
      case "strong":
        content = <strong>{content}</strong>;
        break;
      case "em":
        content = <em>{content}</em>;
        break;
      case "underline":
        content = <u>{content}</u>;
        break;
      case "strike":
        content = <s>{content}</s>;
        break;
      case "code":
        content = (
          <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[0.9em]">
            {content}
          </code>
        );
        break;
      case "subsup":
        content =
          mark.attrs?.type === "sub" ? (
            <sub>{content}</sub>
          ) : (
            <sup>{content}</sup>
          );
        break;
      case "textColor":
        style.color = safeColor(mark.attrs?.color);
        break;
      case "backgroundColor":
        style.backgroundColor = safeColor(mark.attrs?.color);
        break;
      case "link":
        link = mark;
        break;
    }
  }

  const span = <span style={style}>{content}</span>;
  if (!link) return span;

  const href = safeUrl(link.attrs?.href, LINK_PROTOCOLS);
  if (!href) return span;

  return (
    <a
      href={href}
      title={
        typeof link.attrs.title === "string" ? link.attrs.title : undefined
      }
      target="_blank"
      rel="noreferrer"
      className="text-primary underline underline-offset-4"
    >
      {span}
    </a>
  );
};
