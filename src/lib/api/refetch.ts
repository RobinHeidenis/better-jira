const FOCUS_THROTTLE_MS = 10 * 1000;

/**
 * Refetch whenever the tab comes back into focus, not only once the data is
 * stale, except right after a load so switching windows back and forth
 * doesn't fire a request each time.
 */
export const refetchOnReturn = (query: { state: { dataUpdatedAt: number } }) =>
  Date.now() - query.state.dataUpdatedAt > FOCUS_THROTTLE_MS
    ? ("always" as const)
    : false;
