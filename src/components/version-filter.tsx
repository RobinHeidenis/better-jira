import { MilestoneIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useQuery } from "@tanstack/react-query";
import { versionOptions } from "#/lib/api/versions.ts";

const renderVersions = (versionIds: string[]) => {
  const { data: versions } = useQuery({
    ...versionOptions(),
    select: (versions) =>
      versions.filter((version) => versionIds.includes(version.id)),
  });

  return versions?.map((version) => version.name);
};

export const VersionFilter = () => {
  const { data: versions } = useQuery(versionOptions());

  return (
    <Select multiple>
      <SelectTrigger>
        <MilestoneIcon />
        <SelectValue>{renderVersions}</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="min-w-64">
        <SelectGroup>
          {versions?.map((version) => (
            <SelectItem value={version.id} key={version.id}>
              {version.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
