import {
  CircleCheckIcon,
  CircleXIcon,
  FileTextIcon,
  InfoIcon,
  TriangleAlertIcon,
} from "lucide-react";
import type z from "zod";
import { Card, CardContent } from "#/components/ui/card";
import type { panelNode } from "#/lib/adf/block-nodes";
import { BlockNode } from "./block-node";

const colorMap = {
  info: "bg-blue-900/50 border-blue-700",
  note: "bg-purple-900/50 border-purple-700",
  error: "bg-red-900/50 border-red-700",
  success: "bg-green-900/50 border-green-700",
  warning: "bg-yellow-900/50 border-yellow-700",
} as const;

const iconMap = {
  info: InfoIcon,
  note: FileTextIcon,
  error: CircleXIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
} as const;

const iconColorMap = {
  info: "text-blue-500",
  note: "text-purple-500",
  error: "text-red-500",
  success: "text-green-500",
  warning: "text-yellow-500",
};

export const PanelNode = ({ node }: { node: z.infer<typeof panelNode> }) => {
  const Icon = iconMap[node.attrs?.panelType];

  return (
    <Card
      className={`${colorMap[node.attrs?.panelType]} !border-2 my-2 ring-0`}
    >
      <CardContent className="flex gap-2">
        <Icon className={`w-6 -ml-2 ${iconColorMap[node.attrs?.panelType]}`} />
        <div>
          {node.content?.map((child, index) => (
            <BlockNode key={index} node={child} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
