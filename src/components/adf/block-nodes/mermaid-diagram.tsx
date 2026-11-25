import { useEffect, useId, useState } from "react";
import { useTheme } from "#/components/theme-provider";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { renderMermaid } from "#/lib/adf/mermaid";

const useResolvedTheme = () => {
  const { theme } = useTheme();
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export const MermaidDiagram = ({
  source,
  fallback,
}: {
  source: string;
  fallback: React.ReactNode;
}) => {
  const id = `mermaid-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const theme = useResolvedTheme();
  const [result, setResult] = useState<
    { svg: string } | { error: true } | null
  >(null);
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    let cancelled = false;
    renderMermaid(id, source, theme).then(
      (svg) => !cancelled && setResult({ svg }),
      () => !cancelled && setResult({ error: true }),
    );
    return () => {
      cancelled = true;
    };
  }, [id, source, theme]);

  if (result && "error" in result) return fallback;
  if (!result) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="relative w-full border p-4">
      <Button
        variant="ghost"
        size="xs"
        className="absolute top-2 right-2"
        onClick={() => setShowSource((value) => !value)}
      >
        {showSource ? "Diagram" : "Source"}
      </Button>
      {showSource ? (
        fallback
      ) : (
        <div
          className="flex justify-center overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full"
          // Mermaid's strict mode sanitises the SVG it returns.
          // biome-ignore lint/security/noDangerouslySetInnerHtml: see above
          dangerouslySetInnerHTML={{ __html: result.svg }}
        />
      )}
    </div>
  );
};
