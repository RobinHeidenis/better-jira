import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import {
  defaultShouldDehydrateQuery,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { isAttachmentContentQuery } from "#/lib/api/attachments";

const CACHE_KEY = "better-jira:query-cache";

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

export function getContext() {
  const queryClient = new QueryClient({
    // React Query v5 dropped its default logger, so an unread `error` from
    // `useQuery` fails completely silently. Until failures are surfaced in the
    // UI, log them centrally rather than per call site.
    queryCache: new QueryCache({
      onError: (error, query) => {
        console.error("Query failed:", query.queryKey, error);
      },
    }),
    defaultOptions: {
      queries: {
        // A board doesn't change second to second, and remounting a route
        // shouldn't cost a fresh round trip to Jira.
        staleTime: MINUTE,
        // Has to outlive a reload, or there'd be nothing left to persist.
        gcTime: DAY,
      },
    },
  });

  // Browser only: there's no `localStorage` on the server, and a module-level
  // cache there would be shared across every request.
  if (typeof window !== "undefined") {
    // Restoring is async, so a fetch may well start before the cache lands.
    // That's fine — `hydrate` compares `dataUpdatedAt` and won't overwrite
    // fresher data with what was on disk.
    persistQueryClient({
      queryClient,
      persister: createSyncStoragePersister({
        storage: window.localStorage,
        key: CACHE_KEY,
      }),
      maxAge: DAY,
      dehydrateOptions: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) &&
          !isAttachmentContentQuery(query.queryKey),
      },
    });
  }

  return {
    queryClient,
  };
}
export default function TanstackQueryProvider() {}
