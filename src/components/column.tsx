import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { currentUserOptions } from "#/lib/api/current-user";
import { boardIssuesOptions, issueDeveloper } from "#/lib/api/issues";
import { sortForReview } from "#/lib/review-order";
import { type Settings, store } from "#/lib/store";
import { IssueCard } from "./issue-card";
import { CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";

const anyFiltersEnabled = (filters: Settings["filter"]) => {
  return filters?.users?.length || filters?.versions?.length;
};

export const Column = ({
  boardId,
  name,
  statusIds,
  jql,
}: {
  boardId: number;
  name: string;
  statusIds: string[];
  jql: string;
}) => {
  const filters = useSelector(store, (state) => state.filter);
  const includeDevTickets = useSelector(
    store,
    (state) => state.includeDevTickets,
  );
  const developerField = useSelector(store, (state) => state.developerField);
  const storyPointsField = useSelector(
    store,
    (state) => state.storyPointsField,
  );
  const reviewColumn = useSelector(store, (state) => state.reviewColumn);
  const isReviewColumn = reviewColumn === name;
  const { data: currentUser } = useQuery({
    ...currentUserOptions(),
    enabled: isReviewColumn,
  });
  const { data: issuesByStatusId, isPending } = useQuery(
    boardIssuesOptions(boardId, jql, { developerField, storyPointsField }),
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
          if (includeDevTickets && developerField) {
            if (
              !assigneeInFilters &&
              !filters.users.includes(
                issueDeveloper(issue, developerField)?.accountId ?? "",
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

  const visibleIssues =
    isReviewColumn && currentUser
      ? sortForReview(
          filteredColumnIssues,
          currentUser.accountId,
          developerField,
        )
      : filteredColumnIssues;

  return (
    <div className="w-80 shrink-0 bg-card/30 p-4">
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
          : visibleIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                developerField={developerField}
                storyPointsField={storyPointsField}
              />
            ))}
      </div>
    </div>
  );
};
