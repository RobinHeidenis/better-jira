import { usersOptions } from "#/lib/api/users";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "./ui/avatar";
import { useSelector } from "@tanstack/react-store";
import { store } from "#/lib/store.ts";

const renderSelectedUsers = (value: string[]) => {
  const { data: users } = useQuery({
    ...usersOptions(),
    select: (data) => data.filter((user) => value.includes(user.accountId)),
  });

  return (
    <AvatarGroup>
      {users?.map((user) => (
        <Avatar size="sm">
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
      defaultValue={savedSelectedUsers}
    >
      <SelectTrigger>
        <UserIcon data-icon="start" />
        <SelectValue>{renderSelectedUsers}</SelectValue>
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
