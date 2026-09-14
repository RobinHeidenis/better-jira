import { type LinkProps, Link as RouterLink } from "@tanstack/react-router";
import type { PropsWithChildren } from "react";

export const Link = ({
  children,
  className,
  ...linkProps
}: PropsWithChildren<LinkProps & { className?: string }>) => {
  return (
    <RouterLink
      className={`underline underline-offset-4 hover:text-primary ${className}`}
      rel="noopener noreferrer"
      {...linkProps}
    >
      {children}
    </RouterLink>
  );
};
