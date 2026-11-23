import { createFileRoute, redirect } from "@tanstack/react-router";
import { Board } from "#/components/board.tsx";
import { store } from "#/lib/store";

export const Route = createFileRoute("/")({
  // The guard reads a store that only exists in the browser, so the server
  // pass is skipped or it would always redirect to setup.
  ssr: false,
  beforeLoad: () => {
    const { apiToken, boardId } = store.state;
    if (!apiToken) throw redirect({ to: "/setup/account" });
    if (!boardId) throw redirect({ to: "/setup/board" });
  },
  component: Home,
});

function Home() {
  return (
    <div className="p-8 min-h-full flex-col gap-2">
      <Board />
    </div>
  );
}
