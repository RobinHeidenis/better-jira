import type { ReactNode } from "react";
import type z from "zod";
import type { taskListNode } from "#/lib/adf/block-nodes";
import { InlineNode } from "../inline-nodes/inline-node";
import { BlockNode } from "./block-node";

const TaskItem = ({
  state,
  children,
}: {
  state: unknown;
  children: ReactNode;
}) => {
  const done = state === "DONE";
  return (
    <li className="flex items-start gap-2">
      <input
        type="checkbox"
        checked={done}
        readOnly
        disabled
        aria-label={done ? "Done" : "To do"}
        className="mt-1.5 size-3.5 shrink-0 accent-primary"
      />
      <div className="min-w-0 flex-1">{children}</div>
    </li>
  );
};

export const TaskListNode = ({
  node,
}: {
  node: z.infer<typeof taskListNode>;
}) => {
  return (
    <ul className="my-2 space-y-1">
      {node.content?.map((child, index) => {
        switch (child?.type) {
          case "taskItem":
            return (
              <TaskItem key={index} state={child.attrs?.state}>
                {child.content?.map((inline, inlineIndex) =>
                  inline ? (
                    <InlineNode key={inlineIndex} node={inline} />
                  ) : null,
                )}
              </TaskItem>
            );
          case "blockTaskItem":
            return (
              <TaskItem key={index} state={child.attrs?.state}>
                {child.content?.map((block, blockIndex) =>
                  block ? <BlockNode key={blockIndex} node={block} /> : null,
                )}
              </TaskItem>
            );
          case "taskList":
            return (
              <li key={index} className="ml-6">
                <TaskListNode node={child} />
              </li>
            );
          default:
            return null;
        }
      })}
    </ul>
  );
};
