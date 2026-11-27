/** The query parameter better-jira adds to its "Open in Jira" links. */
const PASS_THROUGH = "bj-open";

/** A Jira issue key, like PROJ-123. */
const KEY = "[A-Za-z][A-Za-z0-9_]*-[0-9]+";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The address of better-jira, without a trailing slash, or null when it isn't
 * a usable http(s) URL.
 */
export const normalizeAppUrl = (value) => {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href.replace(/\/+$/, "");
  } catch {
    return null;
  }
};

/** "yourcompany" from "yourcompany.atlassian.net" or a full URL, or null. */
export const normalizeSite = (value) => {
  const host = value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
  if (!host) return null;
  const match = /^([a-z0-9-]+)(\.atlassian\.net)?$/.exec(host);
  return match ? match[1] : undefined;
};

/**
 * Redirect rules for ticket links, with a higher-priority rule that lets
 * better-jira's own "Open in Jira" links through. Only top-level navigations
 * are touched, so Jira's own requests and embeds keep working.
 */
export const buildRules = ({ appUrl, site }) => {
  const host = site ? escapeRegex(site) : "[a-z0-9-]+";
  const origin = `^https://${host}\\.atlassian\\.net`;
  const target = (group) => `${appUrl}/issue/\\${group}`;
  const resourceTypes = ["main_frame"];
  return [
    {
      id: 1,
      priority: 2,
      action: { type: "allow" },
      condition: {
        regexFilter: `${origin}/.*[?&]${PASS_THROUGH}=1`,
        resourceTypes,
      },
    },
    {
      id: 2,
      priority: 1,
      action: {
        type: "redirect",
        redirect: { regexSubstitution: target(1) },
      },
      condition: {
        regexFilter: `${origin}/browse/(${KEY})`,
        resourceTypes,
      },
    },
    {
      id: 3,
      priority: 1,
      action: {
        type: "redirect",
        redirect: { regexSubstitution: target(1) },
      },
      condition: {
        regexFilter: `${origin}/.*[?&]selectedIssue=(${KEY})`,
        resourceTypes,
      },
    },
  ];
};
