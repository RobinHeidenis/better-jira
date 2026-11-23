import { RiSignpostLine } from "@remixicon/react";
import type z from "zod";
import type { decisionListNode } from "#/lib/adf/block-nodes";
import { cn } from "#/lib/utils";
import { InlineNode } from "../inline-nodes/inline-node";

export const DecisionListNode = ({
  node,
}: {
  node: z.infer<typeof decisionListNode>;
}) => {
  return (
    <ul className="my-2 space-y-1">
      {node.content?.map((item, index) =>
        item?.type === "decisionItem" ? (
          <li
            key={index}
            className="flex items-start gap-2 rounded-md bg-muted px-3 py-2"
          >
            <RiSignpostLine
              aria-hidden
              className={cn(
                "mt-0.5 size-4 shrink-0",
                item.attrs?.state === "DECIDED"
                  ? "text-green-600 dark:text-green-500"
                  : "text-muted-foreground",
              )}
            />
            <div className="min-w-0 flex-1">
              {item.content?.map((inline, inlineIndex) =>
                inline ? <InlineNode key={inlineIndex} node={inline} /> : null,
              )}
            </div>
          </li>
        ) : null,
      )}
    </ul>
  );
};
