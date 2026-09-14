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

// POST rather than GET: a GET server function encodes its payload into the
// request URL, which would put the API token in logs and browser history.
export const jiraRequest = createServerFn({ method: "POST" })
  .validator(jiraRequestSchema)
  .handler(async ({ data }) => {
    const base = data.baseUrl.replace(/\/+$/, "");

    const endpoint = `${apiPrefixes[data.endpointType]}/${data.endpoint}`;

    const response = await fetch(`${base}/${endpoint}`, {
      method: data.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...data.headers,
        // The stored token is base64("email:token") — Jira Cloud's basic auth
        // credential, not a bearer token.
        Authorization: `Basic ${data.apiToken}`,
      },
      body: data.body,
    });

    if (!response.ok) {
      throw new Error(
        `Jira request failed: ${response.status} ${response.statusText}`,
      );
    }

    // The caller owns the response shape: schemas are Zod objects and can't
    // cross the RPC boundary, so validation stays on the calling side.
    return (await response.json()) as JsonValue;
  });
