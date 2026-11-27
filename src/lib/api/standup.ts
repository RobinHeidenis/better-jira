import { queryOptions, skipToken } from "@tanstack/react-query";
import { store } from "../store";
import { jqlField, mineJql, searchWithRoles } from "./my-work";
import { refetchOnReturn } from "./refetch";

/** Midnight at the start of the previous weekday: Friday on a Monday. */
export const lastWorkingDay = (now = new Date()) => {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  do {
    day.setDate(day.getDate() - 1);
  } while (day.getDay() === 0 || day.getDay() === 6);
  return day;
};

/** JQL wants local time as "yyyy-MM-dd HH:mm". */
const jqlDate = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** Tickets the current user moved into one of the review statuses. */
export const movedToReviewOptions = (statusIds: string[], since: Date) => {
  const { developerField } = store.get();
  return queryOptions({
    queryKey: ["standup", "moved-to-review", 2, statusIds, since.toISOString()],
    queryFn: statusIds.length
      ? ({ client }) =>
          searchWithRoles(
            client,
            `status CHANGED TO (${statusIds.join(", ")}) BY currentUser() AFTER "${jqlDate(since)}" ORDER BY updated DESC`,
            developerField,
          )
      : skipToken,
    refetchOnWindowFocus: refetchOnReturn,
  });
};

/** The current user's To Do tickets that have a start date, soonest first. */
export const plannedTodosOptions = () => {
  const { developerField, startDateField } = store.get();
  return queryOptions({
    queryKey: ["standup", "planned-todos", 2, developerField, startDateField],
    queryFn: startDateField
      ? ({ client }) => {
          const start = jqlField(startDateField);
          return searchWithRoles(
            client,
            `(${mineJql(developerField)}) AND statusCategory = "To Do" AND ${start} is not EMPTY ORDER BY ${start} ASC`,
            developerField,
            [startDateField],
          );
        }
      : skipToken,
    refetchOnWindowFocus: refetchOnReturn,
  });
};
