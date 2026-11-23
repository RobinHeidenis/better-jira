import { createContext, use } from "react";
import type { Attachment } from "#/lib/api/attachments";

type AdfContextValue = {
  attachments: readonly Attachment[];
  issueKey?: string;
};

export const AdfContext = createContext<AdfContextValue>({ attachments: [] });

export const useAdfContext = () => use(AdfContext);
