import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { buildRules, SETTINGS_KEYS, type Settings } from "../lib/rules";

const applyRules = async () => {
  const {
    appUrl,
    site,
    enabled = true,
  } = await browser.storage.sync.get<Settings>(SETTINGS_KEYS);
  const existing = await browser.declarativeNetRequest.getDynamicRules();
  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules: appUrl && enabled ? buildRules(appUrl, site) : [],
  });
};

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async () => {
    await applyRules();
    const { appUrl } = await browser.storage.sync.get<Settings>("appUrl");
    if (!appUrl) void browser.runtime.openOptionsPage();
  });
  browser.runtime.onStartup.addListener(() => void applyRules());
  browser.storage.onChanged.addListener(() => void applyRules());
  browser.action.onClicked.addListener(
    () => void browser.runtime.openOptionsPage(),
  );
});
