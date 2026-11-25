import { RiSettings3Line } from "@remixicon/react";
import type { ReactNode } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Link } from "./ui/link";
import { UserFilter } from "./user-filter";
import { VersionFilter } from "./version-filter";

export const BoardFilters = ({ search }: { search: ReactNode }) => {
  return (
    <Card>
      <CardContent className="flex gap-2">
        <UserFilter />
        <VersionFilter />
        {search}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          title="Settings"
          className="ml-auto"
          nativeButton={false}
          render={<Link to="/settings" underlined={false} />}
        >
          <RiSettings3Line />
        </Button>
      </CardContent>
    </Card>
  );
};
