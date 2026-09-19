import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { boardIssuesOptions } from "#/lib/api/issues";
import { store, type Settings } from "#/lib/store";
import { IssueCard } from "./issue-card";
import { CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";

const anyFiltersEnabled = (filters: Settings["filter"]) => {
  return filters?.users?.length || filters?.versions?.length;
};

export const Column = ({
  name,
  statusIds,
  jql,
}: {
  name: string;
  statusIds: string[];
  jql: string;
}) => {
  const boardId = useSelector(store, (state) => state.boardId)!;
  const filters = useSelector(store, (state) => state.filter);
  const includeDevTickets = useSelector(
    store,
    (state) => state.includeDevTickets,
  );
  const { data: issuesByStatusId, isPending } = useQuery(
    boardIssuesOptions(boardId, jql),
  );

  const columnIssues = statusIds.flatMap(
    (statusId) => issuesByStatusId?.[statusId] ?? [],
  );

  const filteredColumnIssues = anyFiltersEnabled(filters)
    ? columnIssues.filter((issue) => {
        if (filters?.users?.length) {
          const assigneeInFilters = filters.users.includes(
            issue.fields.assignee?.accountId ?? "",
          );
          if (includeDevTickets) {
            if (
              !assigneeInFilters &&
              !filters.users.includes(
                issue.fields.customfield_10031?.accountId ?? "",
              )
            ) {
              return false;
            }
          } else if (!assigneeInFilters) {
            return false;
          }
        }

        if (
          filters?.versions?.length &&
          !issue.fields.fixVersions?.some((version) =>
            filters.versions?.includes(version.id),
          )
        ) {
          return false;
        }

        return true;
      })
    : columnIssues;

  return (
    <div className="w-80 flex-shrink-0 bg-card/30 p-4">
      <CardTitle>
        {name}
        {!isPending &&
          ` (${filteredColumnIssues.length !== columnIssues.length ? `${filteredColumnIssues.length} / ` : ""}${columnIssues.length})`}
      </CardTitle>
      <Separator className="my-4" />
      <div className="space-y-4">
        {isPending
          ? // A fixed few, since the real count isn't known until the first
            // page of issues arrives.
            [0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-32 w-full" />
            ))
          : filteredColumnIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
      </div>
    </div>
  );
};
