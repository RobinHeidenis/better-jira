import { normalizeAppUrl, normalizeSite } from "./rules.js";

const form = document.getElementById("form");
const appUrlInput = document.getElementById("appUrl");
const siteInput = document.getElementById("site");
const enabledInput = document.getElementById("enabled");
const status = document.getElementById("status");

const show = (message, isError = false) => {
  status.textContent = message;
  status.className = isError ? "error" : "";
};

const saved = await chrome.storage.sync.get(["appUrl", "site", "enabled"]);
appUrlInput.value = saved.appUrl ?? "";
siteInput.value = saved.site ? `${saved.site}.atlassian.net` : "";
enabledInput.checked = saved.enabled ?? true;

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
  await chrome.storage.sync.set({
    appUrl,
    site,
    enabled: enabledInput.checked,
  });
  show("Saved.");
});
