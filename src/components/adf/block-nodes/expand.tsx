import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import type z from "zod";
import { Button } from "#/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "#/components/ui/collapsible";
import type { expandNode } from "#/lib/adf/block-nodes";
import { BlockNode } from "./block-node";

export const ExpandNode = ({ node }: { node: z.infer<typeof expandNode> }) => {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={"bg-muted mt-2"}>
      <CollapsibleTrigger
        render={
          <Button
            variant="ghost"
            className="flex items-center justify-start gap-2 w-full text-stone-300 font-bold"
          >
            {open ? (
              <ChevronDownIcon className="-ml-1" />
            ) : (
              <ChevronRightIcon className="-ml-1" />
            )}
            {node.attrs.title ?? "Expand content"}
          </Button>
        }
      />
      <CollapsibleContent className="pl-7 pb-2">
        {node.content?.map((child, index) => (
          <BlockNode key={index} node={child} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};
