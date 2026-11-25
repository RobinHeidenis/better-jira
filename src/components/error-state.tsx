import { RiErrorWarningLine, RiRefreshLine } from "@remixicon/react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";

/** A failed load, said plainly, with a way to try again. */
export const ErrorState = ({
  title,
  error,
  onRetry,
  children,
}: {
  title: string;
  error?: Error | null;
  onRetry?: () => void;
  children?: ReactNode;
}) => (
  <div
    role="alert"
    className="flex items-start gap-3 border border-destructive/40 bg-destructive/5 p-4 text-xs"
  >
    <RiErrorWarningLine className="mt-0.5 size-4 shrink-0 text-destructive" />
    <div className="min-w-0 flex-1 space-y-1">
      <p className="font-medium">{title}</p>
      {error ? (
        <p className="break-words text-muted-foreground">{error.message}</p>
      ) : null}
      {children}
    </div>
    {onRetry ? (
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RiRefreshLine data-icon="inline-start" />
        Try again
      </Button>
    ) : null}
  </div>
);
