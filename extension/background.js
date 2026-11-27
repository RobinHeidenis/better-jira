import { buildRules } from "./rules.js";

const applyRules = async () => {
  const {
    appUrl,
    site,
    enabled = true,
  } = await chrome.storage.sync.get(["appUrl", "site", "enabled"]);
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules: appUrl && enabled ? buildRules({ appUrl, site }) : [],
  });
};

chrome.runtime.onInstalled.addListener(async () => {
  await applyRules();
  const { appUrl } = await chrome.storage.sync.get("appUrl");
  if (!appUrl) chrome.runtime.openOptionsPage();
});

chrome.runtime.onStartup.addListener(applyRules);
chrome.storage.onChanged.addListener(applyRules);
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
