import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { MilestoneIcon } from "lucide-react";
import { versionOptions } from "#/lib/api/versions.ts";
import { store } from "#/lib/store.ts";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

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
  const savedSelectedVersions = useSelector(
    store,
    (state) => state.filter?.versions,
  );

  const updateFilters = (selectedVersions: string[]) =>
    store.setState((state) => ({
      ...state,
      filter: {
        ...state.filter,
        versions: selectedVersions,
      },
    }));

  return (
    <Select
      multiple
      onValueChange={updateFilters}
      defaultValue={savedSelectedVersions}
    >
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
