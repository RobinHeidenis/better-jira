import { browser } from "wxt/browser";
import {
  normalizeAppUrl,
  normalizeSite,
  SETTINGS_KEYS,
  type Settings,
} from "../../lib/rules";

const element = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;

const form = element<HTMLFormElement>("form");
const appUrlInput = element<HTMLInputElement>("appUrl");
const siteInput = element<HTMLInputElement>("site");
const enabledInput = element<HTMLInputElement>("enabled");
const status = element<HTMLSpanElement>("status");
const access = element<HTMLParagraphElement>("access");
const grant = element<HTMLButtonElement>("grant");

const hosts = { origins: ["https://*.atlassian.net/*"] };

const show = (message: string, isError = false) => {
  status.textContent = message;
  status.className = isError ? "error" : "";
};

// Firefox can install the extension without access to Jira's pages, and
// without it the redirect rules do nothing.
const checkAccess = async () => {
  access.hidden = await browser.permissions.contains(hosts);
};

grant.addEventListener("click", async () => {
  await browser.permissions.request(hosts);
  await checkAccess();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const appUrl = normalizeAppUrl(appUrlInput.value);
  if (!appUrl) {
    show("Enter the full address, starting with http:// or https://.", true);
    return;
  }
  const site = normalizeSite(siteInput.value);
  if (site === undefined) {
    show("The Jira site should look like yourcompany.atlassian.net.", true);
    return;
  }
  const settings: Settings = { appUrl, site, enabled: enabledInput.checked };
  await browser.storage.sync.set(settings);
  show("Saved.");
});

const load = async () => {
  const saved = await browser.storage.sync.get<Settings>(SETTINGS_KEYS);
  appUrlInput.value = saved.appUrl ?? "";
  siteInput.value = saved.site ? `${saved.site}.atlassian.net` : "";
  enabledInput.checked = saved.enabled ?? true;
  await checkAccess();
};

void load();
