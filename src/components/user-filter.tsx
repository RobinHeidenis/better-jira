import { RiUserLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { usersOptions } from "#/lib/api/users";
import { store } from "#/lib/store.ts";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "./ui/avatar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const SelectedUsers = ({ value }: { value: string[] }) => {
  const { data: users } = useQuery({
    ...usersOptions(),
    select: (data) => data.filter((user) => value.includes(user.accountId)),
  });

  return (
    <AvatarGroup>
      {users?.map((user) => (
        <Avatar key={user.accountId} size="sm">
          <AvatarImage src={user.avatarUrls["48x48"]} />
          <AvatarFallback>AA</AvatarFallback>
        </Avatar>
      ))}
    </AvatarGroup>
  );
};

export const UserFilter = () => {
  const { data: users } = useQuery(usersOptions());
  const savedSelectedUsers = useSelector(store, (state) => state.filter?.users);
  // "Mine" already narrows to one person, so the two can't be combined.
  const onlyMine = useSelector(store, (state) => state.onlyMine);

  const updateFilters = (selectedUsers: string[]) =>
    store.setState((state) => ({
      ...state,
      filter: {
        ...state.filter,
        users: selectedUsers,
      },
    }));

  return (
    <Select
      multiple
      onValueChange={updateFilters}
      value={savedSelectedUsers ?? []}
      disabled={onlyMine}
    >
      <SelectTrigger
        title={onlyMine ? "Turn off Mine to filter by user" : undefined}
      >
        <RiUserLine data-icon="start" />
        <SelectValue>
          {(value: string[]) => <SelectedUsers value={value} />}
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="min-w-48">
        <SelectGroup>
          {users?.map((user) => (
            <SelectItem key={user.accountId} value={user.accountId}>
              <div className="flex items-center gap-2">
                <Avatar size="sm" rounded={false}>
                  <AvatarImage src={user.avatarUrls["48x48"] ?? ""} />
                  <AvatarFallback>AA</AvatarFallback>
                </Avatar>
                {user.displayName}
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
