import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { BoardColumns } from "#/components/board-columns";
import { store } from "#/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const navigate = useNavigate();
  const completedAccountSetup = useSelector(store, (state) => !!state.apiToken);
  const completedBoardSetup = useSelector(store, (state) => !!state.boardId);

  if (!completedAccountSetup) {
    navigate({ to: "/setup/account" });
    return;
  }

  if (!completedBoardSetup) {
    navigate({ to: "/setup/board" });
    return;
  }

  return (
    <div className="p-8 min-h-full flex gap-2">
      <BoardColumns />
    </div>
  );
}
