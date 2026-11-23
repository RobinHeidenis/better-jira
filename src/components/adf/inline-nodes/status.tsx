import type z from "zod";
import { Badge } from "#/components/ui/badge";
import type { statusNode } from "#/lib/adf/inline-nodes";

const colorMap = {
  neutral: "",
  purple: "bg-purple-950 text-purple-300",
  blue: "bg-blue-950 text-blue-300",
  red: "bg-red-950 text-red-300",
  yellow: "bg-yellow-950 text-yellow-300",
  green: "bg-green-950 text-green-300",
};

export const StatusNode = ({ node }: { node: z.infer<typeof statusNode> }) => {
  const isHex = node.attrs.color.startsWith("#");

  return (
    <Badge
      className={
        !isHex ? colorMap[node.attrs.color as keyof typeof colorMap] : undefined
      }
      style={
        isHex
          ? { backgroundColor: node.attrs.color, color: "black" }
          : undefined
      }
      variant="outline"
    >
      {node.attrs.text ?? node.attrs.localId}
    </Badge>
  );
};
