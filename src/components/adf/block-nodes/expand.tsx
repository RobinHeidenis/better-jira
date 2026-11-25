import { RiArrowDownSLine, RiArrowRightSLine } from "@remixicon/react";
import { useState } from "react";
import type z from "zod";
import { Button } from "#/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "#/components/ui/collapsible";
import type { expandNode, nestedExpandNode } from "#/lib/adf/block-nodes";
import { BlockNode } from "./block-node";

export const ExpandNode = ({
  node,
}: {
  node: z.infer<typeof expandNode> | z.infer<typeof nestedExpandNode>;
}) => {
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
              <RiArrowDownSLine className="-ml-1" />
            ) : (
              <RiArrowRightSLine className="-ml-1" />
            )}
            {node.attrs?.title || "Expand content"}
          </Button>
        }
      />
      <CollapsibleContent className="pr-4 pb-2 pl-7">
        {node.content?.map((child, index) => (
          <BlockNode key={index} node={child} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};
