import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { jiraBaseUrlSchema } from "../jira-url";

/**
 * Atlassian serves no CORS headers on the REST API, so the browser can't call
 * Jira itself. This proxies the call from the server instead.
 *
 * Credentials live in the user's browser (see `#/lib/store`), not on the
 * server, so each call has to carry its own rather than read a session.
 */
const jiraRequestSchema = z.object({
  baseUrl: jiraBaseUrlSchema,
  apiToken: z.string().min(1),
  endpoint: z.string().min(1),
  method: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  query: z.record(z.string(), z.string()).optional(),
  endpointType: z
    .enum(["jira", "atlassian", "software"])
    .optional()
    .default("jira"),
});

export type JiraRequestInput = z.infer<typeof jiraRequestSchema>;

/**
 * `software` is the newer, non-deprecated half of the Agile API: the
 * `agile/1.0` board issue endpoints are all deprecated in favour of
 * `software/1.0` equivalents, which page by token instead of by index.
 */
const apiPrefixes: Record<JiraRequestInput["endpointType"], string> = {
  jira: "rest/agile/1.0",
  atlassian: "rest/api/3",
  software: "rest/software/1.0",
};

/** Whatever Jira sent back, before the caller's schema has had a look at it. */
type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const MAX_ERROR_BODY = 500;

// POST rather than GET: a GET server function encodes its payload into the
// request URL, which would put the API token in logs and browser history.
export const jiraRequest = createServerFn({ method: "POST" })
  .validator(jiraRequestSchema)
  .handler(async ({ data }) => {
    const base = data.baseUrl.replace(/\/+$/, "");

    const endpoint = `${apiPrefixes[data.endpointType]}/${data.endpoint}`;

    const params = new URLSearchParams(data.query).toString();
    const response = await fetch(
      `${base}/${endpoint}${params ? `?${params}` : ""}`,
      {
        method: data.method ?? "GET",
        headers: {
          Accept: "application/json",
          ...data.headers,
          Authorization: `Basic ${data.apiToken}`,
        },
        body: data.body,
      },
    );

    const responseText = await response.text();

    if (!response.ok) {
      const body =
        responseText.length > MAX_ERROR_BODY
          ? `${responseText.slice(0, MAX_ERROR_BODY)}…`
          : responseText;
      throw new Error(
        `Jira request failed: ${response.status} ${response.statusText}${body ? `: ${body}` : ""}`,
      );
    }

    return (await JSON.parse(responseText)) as JsonValue;
  });
