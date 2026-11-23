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
      throw requestError("Jira request", response, responseText);
    }

    return (await JSON.parse(responseText)) as JsonValue;
  });

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const jiraAttachmentContentSchema = z.object({
  baseUrl: jiraBaseUrlSchema,
  apiToken: z.string().min(1),
  attachmentId: z.string().regex(/^\d+$/),
});

const MIME_TYPE = /^[\w.+-]+\/[\w.+-]+$/;

/**
 * Attachment bytes, base64 encoded. Jira answers with a redirect to a signed
 * media URL on another host; fetch follows it and, per the Fetch spec, drops
 * the Authorization header on the way, which the signed URL doesn't need.
 */
export const jiraAttachmentContent = createServerFn({ method: "POST" })
  .validator(jiraAttachmentContentSchema)
  .handler(async ({ data }) => {
    const base = data.baseUrl.replace(/\/+$/, "");
    const response = await fetch(
      `${base}/rest/api/3/attachment/content/${data.attachmentId}`,
      { headers: { Authorization: `Basic ${data.apiToken}` } },
    );

    if (!response.ok) {
      throw requestError(
        "Jira attachment request",
        response,
        await response.text(),
      );
    }

    const tooLarge = () =>
      new Error(
        `Jira attachment request failed: attachment is larger than ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB`,
      );

    if (Number(response.headers.get("content-length")) > MAX_ATTACHMENT_BYTES) {
      await response.body?.cancel();
      throw tooLarge();
    }

    // Content-Length can be missing, so the limit is enforced while reading too.
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = response.body?.getReader();
    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ATTACHMENT_BYTES) {
        await reader.cancel();
        throw tooLarge();
      }
      chunks.push(value);
    }

    const contentType =
      response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";

    return {
      mimeType: MIME_TYPE.test(contentType)
        ? contentType
        : "application/octet-stream",
      base64: Buffer.concat(chunks).toString("base64"),
    };
  });

function requestError(label: string, response: Response, text: string) {
  const body =
    text.length > MAX_ERROR_BODY ? `${text.slice(0, MAX_ERROR_BODY)}…` : text;
  return new Error(
    `${label} failed: ${response.status} ${response.statusText}${body ? `: ${body}` : ""}`,
  );
}
