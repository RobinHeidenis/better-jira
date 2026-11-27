import { defineConfig } from "wxt";

export default defineConfig({
  // Imports stay explicit, like in the app.
  imports: false,
  // Firefox runs Manifest V3 extensions, so both builds use the same model.
  manifestVersion: 3,
  manifest: {
    name: "better-jira links",
    description: "Opens Jira ticket links in better-jira instead of Jira.",
    permissions: ["declarativeNetRequestWithHostAccess", "storage"],
    host_permissions: ["https://*.atlassian.net/*"],
    action: { default_title: "better-jira links settings" },
    browser_specific_settings: {
      gecko: {
        // Firefox needs a fixed id to keep the extension's saved settings.
        id: "better-jira-links@better-jira",
        data_collection_permissions: { required: ["none"] },
      },
    },
  },
});
