import { z } from "zod";

/**
 * Exactly one subdomain label under `atlassian.net`, which is the shape every
 * Jira Cloud site takes. Anchored at both ends because Zod matches this with a
 * bare `RegExp.test`, so an unanchored pattern would also accept
 * `atlassian.net.evil.com` and `not-atlassian.net`.
 */
const JIRA_CLOUD_HOSTNAME =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.atlassian\.net$/i;

/**
 * The one URL the server is willing to call on a caller's behalf.
 *
 * The server function that proxies Jira takes its target from the request, so
 * without this it would fetch anywhere the caller pointed it — cloud metadata
 * endpoints and other internal addresses included. Pinning the scheme and the
 * host leaves it useful only for the thing it exists to do.
 */
export const jiraBaseUrlSchema = z.url({
  protocol: /^https$/,
  hostname: JIRA_CLOUD_HOSTNAME,
  error:
    "Must be a Jira Cloud URL, for example https://yourcompany.atlassian.net",
});

/**
 * Where a ticket lives on a Jira Cloud site. `/browse/<key>` resolves for any
 * project, so the key alone is enough — no project or board lookup needed.
 */
export const jiraIssueUrl = (baseUrl: string, issueKey: string) =>
  `${baseUrl.replace(/\/+$/, "")}/browse/${issueKey}`;
