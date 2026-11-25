import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { request } from "./api";

/**
 * `fields` replaces values; `update` applies operations like
 * `{ labels: [{ add: "x" }] }`, which don't clash when several are in flight.
 */
export type IssueEdit = {
  fields?: Record<string, unknown>;
  update?: Record<string, { add?: unknown; remove?: unknown }[]>;
};

export const updateIssue = async (issueKey: string, edit: IssueEdit) => {
  await request(`issue/${issueKey}`, z.unknown(), "atlassian", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(edit),
  });
};

const prioritySchema = z.object({
  id: z.string(),
  name: z.string(),
  iconUrl: z.string().optional(),
});

export const prioritiesOptions = () => {
  return queryOptions({
    queryKey: ["priorities"],
    queryFn: () => request("priority", z.array(prioritySchema), "atlassian"),
    staleTime: 60 * 60 * 1000,
  });
};

export const labelsOptions = () => {
  return queryOptions({
    queryKey: ["labels"],
    queryFn: async () =>
      (
        await request(
          "label?maxResults=1000",
          z.object({ values: z.array(z.string()) }),
          "atlassian",
        )
      ).values,
    staleTime: 10 * 60 * 1000,
  });
};
