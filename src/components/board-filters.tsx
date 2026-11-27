import {
  RiSearchLine,
  RiSettings3Line,
  RiUserStarLine,
} from "@remixicon/react";
import { useSelector } from "@tanstack/react-store";
import type { ReactNode } from "react";
import { store } from "#/lib/store";
import { issuePaletteOpen } from "./issue-palette";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Link } from "./ui/link";
import { UserFilter } from "./user-filter";
import { VersionFilter } from "./version-filter";

export const BoardFilters = ({ search }: { search: ReactNode }) => {
  const onlyMine = useSelector(store, (state) => state.onlyMine);
  return (
    <Card>
      <CardContent className="flex gap-2">
        <UserFilter />
        <VersionFilter />
        <Button
          variant={onlyMine ? "default" : "outline"}
          aria-pressed={onlyMine}
          title="Only tickets assigned to or developed by you"
          onClick={() =>
            store.setState((state) => ({
              ...state,
              onlyMine: !state.onlyMine,
              filter: state.onlyMine
                ? state.filter
                : { ...state.filter, users: [] },
            }))
          }
        >
          <RiUserStarLine data-icon="inline-start" />
          Mine
        </Button>
        {search}
        <Button
          variant="outline"
          className="ml-auto"
          title="Find any issue in Jira (Cmd/Ctrl+K)"
          onClick={() => issuePaletteOpen.setState(() => true)}
        >
          <RiSearchLine data-icon="inline-start" />
          Find issue
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          title="Settings"
          nativeButton={false}
          render={<Link to="/settings" underlined={false} />}
        >
          <RiSettings3Line />
        </Button>
      </CardContent>
    </Card>
  );
};
