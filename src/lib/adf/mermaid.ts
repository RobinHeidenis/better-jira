// Jira's editor has no Mermaid language, so diagrams usually arrive as plain
// code blocks and are recognised by their opening keyword.
const DIAGRAM_START =
  /^(?:---|%%|graph\b|flowchart\b|sequenceDiagram\b|classDiagram\b|stateDiagram\b|erDiagram\b|journey\b|gantt\b|pie\b|quadrantChart\b|requirementDiagram\b|gitGraph\b|C4\w+\b|mindmap\b|timeline\b|sankey\b|xychart\b|block\b|packet\b|kanban\b|architecture\b|radar\b|treemap\b)/;

export const isMermaid = (language: string | undefined, source: string) =>
  language?.toLowerCase() === "mermaid" ||
  (!language && DIAGRAM_START.test(source.trimStart()));

export const renderMermaid = async (
  id: string,
  source: string,
  theme: "dark" | "light",
) => {
  const { default: mermaid } = await import("mermaid");
  // `strict` keeps HTML labels and click handlers out of diagrams written by
  // anyone with edit access to the ticket.
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: theme === "dark" ? "dark" : "default",
  });
  const { svg } = await mermaid.render(id, source);
  return svg;
};
