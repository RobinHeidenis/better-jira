import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { Board } from "#/components/board.tsx";
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
    <div className="p-8 min-h-full flex-col gap-2">
      <Board />
    </div>
  );
}
