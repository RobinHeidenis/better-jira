import { Card, CardContent } from "./ui/card";
import { UserFilter } from "./user-filter";
import { VersionFilter } from "./version-filter";

export const BoardFilters = () => {
  return (
    <Card>
      <CardContent className="flex gap-2">
        <UserFilter />
        <VersionFilter />
      </CardContent>
    </Card>
  );
};
