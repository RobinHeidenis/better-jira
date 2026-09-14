import { useQuery } from "@tanstack/react-query";
import { useSelector } from "@tanstack/react-store";
import { boardIssuesOptions } from "#/lib/api/issues";
import { store } from "#/lib/store";
import { IssueCard } from "./issue-card";
import { CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";

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
  const { data: issuesByStatusId, isPending } = useQuery(
    boardIssuesOptions(boardId, jql),
  );

  const columnIssues = statusIds.flatMap(
    (statusId) => issuesByStatusId?.[statusId] ?? [],
  );

  return (
    <div className="w-80 flex-shrink-0 bg-card/30 p-4">
      <CardTitle>
        {name}
        {!isPending && ` (${columnIssues.length})`}
      </CardTitle>
      <Separator className="my-4" />
      <div className="space-y-4">
        {isPending
          ? // A fixed few, since the real count isn't known until the first
            // page of issues arrives.
            [0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-32 w-full" />
            ))
          : columnIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
      </div>
    </div>
  );
};
