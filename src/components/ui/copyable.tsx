import { type RemixiconComponentType, RiCheckLine } from "@remixicon/react";
import { useState } from "react";
import { cn } from "#/lib/utils.ts";
import { SharedTooltipTrigger } from "./tooltip";

export const Copyable = ({
  value,
  icon: Icon,
  size = 14,
  tooltip = "Copy to clipboard",
  className,
}: {
  value: string;
  icon: RemixiconComponentType;
  size?: number;
  tooltip?: string;
  className?: string;
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(value);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <>
      {/* Radix renders a bare <button>, which defaults to type="submit" and
          would post any form this ends up inside. */}
      <SharedTooltipTrigger
        content={tooltip}
        aria-label={tooltip}
        className={cn("cursor-pointer", className)}
        onClick={copy}
        type="button"
      >
        {isCopied ? <RiCheckLine size={size} /> : <Icon size={size} />}
      </SharedTooltipTrigger>
    </>
  );
};
