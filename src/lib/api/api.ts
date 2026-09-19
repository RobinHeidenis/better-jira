import type { z } from "zod";
import { store } from "../store";
import { type JiraRequestInput, jiraRequest } from "./api.functions";

/**
 * The subset of `RequestInit` that survives the trip to the server function.
 * A full `RequestInit` can't be serialised, and nothing here needs more.
 */
export type JiraRequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  query?: Record<string, string>;
};

export const request = async <TSchema extends z.ZodType>(
  endpoint: string,
  schema: TSchema,
  endpointType: JiraRequestInput["endpointType"] = "jira",
  options: JiraRequestOptions = {},
): Promise<z.infer<TSchema>> => {
  const { apiToken, baseUrl } = store.get();

  // Only reachable if a caller runs before setup finishes, or on the server,
  // where the store deliberately keeps its (credential-free) defaults.
  if (!apiToken || !baseUrl) {
    throw new Error("Jira is not configured yet — finish setup first.");
  }

  const data = await jiraRequest({
    data: { ...options, endpoint, apiToken, baseUrl, endpointType },
  });

  return schema.parse(data);
};
