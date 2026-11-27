import type { Browser } from "wxt/browser";

type Rule = Browser.declarativeNetRequest.Rule;

/** The query parameter better-jira adds to its "Open in Jira" links. */
const PASS_THROUGH = "bj-open";

/** A Jira issue key, like PROJ-123. */
const KEY = "[A-Za-z][A-Za-z0-9_]*-[0-9]+";

export type Settings = {
  appUrl?: string;
  /** The site's subdomain, like "yourcompany". */
  site?: string | null;
  enabled?: boolean;
};

export const SETTINGS_KEYS: (keyof Settings)[] = ["appUrl", "site", "enabled"];

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** better-jira's address without a trailing slash, or null if unusable. */
export const normalizeAppUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href.replace(/\/+$/, "");
  } catch {
    return null;
  }
};

/**
 * "yourcompany" from "yourcompany.atlassian.net" or a full URL; null when
 * empty, undefined when it isn't an Atlassian site.
 */
export const normalizeSite = (value: string) => {
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
export const buildRules = (appUrl: string, site?: string | null): Rule[] => {
  const host = site ? escapeRegex(site) : "[a-z0-9-]+";
  const origin = `^https://${host}\\.atlassian\\.net`;
  const resourceTypes: Rule["condition"]["resourceTypes"] = ["main_frame"];
  const redirect = (id: number, regexFilter: string): Rule => ({
    id,
    priority: 1,
    action: {
      type: "redirect",
      redirect: { regexSubstitution: `${appUrl}/issue/\\1` },
    },
    condition: { regexFilter, resourceTypes },
  });
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
    redirect(2, `${origin}/browse/(${KEY})`),
    redirect(3, `${origin}/.*[?&]selectedIssue=(${KEY})`),
  ];
};
