# better-jira

A faster, nicer front end for Jira Cloud boards and issues. It shows a board's columns with user and fix version filters, and renders issue descriptions from Atlassian Document Format. GitLab merge request lookup is in progress.

Your Jira credentials stay in your browser's local storage. Requests go through the app's own server only because Atlassian's REST API sends no CORS headers.

## Setup

You need Node and pnpm.

```sh
pnpm install
pnpm dev
```

The app runs at http://localhost:3001. On first load it walks you through setup:

1. **Account:** your Jira Cloud URL (`https://yourcompany.atlassian.net`), your Atlassian email and an [API token](https://id.atlassian.com/manage-profile/security/api-tokens).
2. **Board:** the board to show, which columns to hide, and optionally the custom fields your site uses for the developer of a ticket and for story points.

## Scripts

| Script                 | What it does                               |
| ---------------------- | ------------------------------------------ |
| `pnpm dev`             | Start the dev server on port 3001          |
| `pnpm build`           | Build for production                       |
| `pnpm preview`         | Serve the production build                 |
| `pnpm typecheck`       | Type-check with `tsc`                      |
| `pnpm check`           | Lint and check formatting with Biome       |
| `pnpm lint`            | Lint only                                  |
| `pnpm format`          | Check formatting only                      |
| `pnpm generate-routes` | Regenerate `src/routeTree.gen.ts`          |
