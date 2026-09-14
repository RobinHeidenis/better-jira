import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BoardSetupForm } from "#/components/board-setup-form";
import { Card, CardDescription, CardTitle } from "#/components/ui/card";
import { Spinner } from "#/components/ui/spinner";
import { allBoardsOptions } from "#/lib/api/boards";
import { currentUserOptions } from "#/lib/api/current-user";

export const Route = createFileRoute("/setup/board")({
  // The query below reads credentials from a browser-only store, so a server
  // pass could only ever render a failure.
  ssr: false,
  component: RouteComponent,
});

function RouteComponent() {
  const { data: user, isLoading: isUserLoading } = useQuery(
    currentUserOptions(),
  );
  const { data: boards, isLoading: isBoardsLoading } = useQuery(
    allBoardsOptions(),
  );

  return (
    <div className="w-full h-screen flex items-center justify-center">
      <Card className="p-5">
        <CardTitle>Setup board</CardTitle>
        {user && (
          <CardDescription>Logged in as {user?.displayName}</CardDescription>
        )}

        {isUserLoading || isBoardsLoading ? (
          <Spinner />
        ) : (
          <BoardSetupForm boardList={boards?.values ?? []} />
        )}
      </Card>
    </div>
  );
}
