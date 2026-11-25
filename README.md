# better-jira

A faster front end for Jira Cloud boards and tickets, with GitLab merge requests next to the work they belong to. It works against any Jira Cloud site.

## What it does

- **Board.** Every column of a board on one screen. Only the cards you can see are rendered, so boards with hundreds of tickets stay quick.
- **Filters and search.** Filter by user, by fix version, or with "Mine" for tickets assigned to you or developed by you. Cmd/Ctrl+F searches every ticket on the board, including off-screen ones, and Enter jumps between matches.
- **Code review ordering.** Pick a code review column in settings, and it lists reviews waiting on you first, then your own work, then tickets you reported.
- **Ticket view.** The full description, including tables, code blocks, Mermaid diagrams, images and videos. A sidebar has status, people, parent, subtasks and linked tickets.
- **Checklists.** If your site uses Issue Checklist Pro, the checklist shows in its own tab, grouped, with progress. Custom statuses like "done by dev" are shown separately from done.
- **Merge requests.** A popover on each card and a list in the sidebar show the merge requests that name the ticket or its subtasks, with pipeline status, approvals and conflicts.

## Running it

You need Node and pnpm.

```sh
pnpm install
pnpm dev
```

It runs at http://localhost:3001. The first visit walks you through setup.

1. **Account.** Your Jira Cloud URL (`https://yourcompany.atlassian.net`), your Atlassian email and an API token. Create the token at https://id.atlassian.com/manage-profile/security/api-tokens.
2. **Board.** The board to show, which columns to hide, and optionally the custom fields your site uses for the developer, story points and the checklist.
3. **GitLab** (optional). A personal access token with `read_api`, created at https://gitlab.com/-/user_settings/personal_access_tokens, and the projects to search for merge requests.

Everything except the account can be changed later in settings, behind the gear on the board.

## Where your credentials go

Your Jira and GitLab tokens stay in your browser's local storage. GitLab is called straight from the browser. Jira calls go through this app's own server, because Atlassian's REST API sends no CORS headers. That server only forwards requests to `*.atlassian.net` and stores nothing.

## Keyboard shortcuts

On the board:

| Key            | Action                                  |
| -------------- | --------------------------------------- |
| `j` / `k`      | Next or previous card in the column     |
| `h` / `l`      | Previous or next column                 |
| `Enter` or `o` | Open the selected card                  |
| `/`            | Search the board                        |
| `Cmd/Ctrl+F`   | Search the board (press again for the browser's own find) |

On a ticket, `Esc` goes back to the board.

## Scripts

| Script                 | What it does                         |
| ---------------------- | ------------------------------------ |
| `pnpm dev`             | Start the dev server on port 3001    |
| `pnpm build`           | Build for production                 |
| `pnpm preview`         | Serve the production build           |
| `pnpm typecheck`       | Type-check with `tsc`                |
| `pnpm check`           | Lint and check formatting with Biome |
| `pnpm lint`            | Lint only                            |
| `pnpm format`          | Check formatting only                |
| `pnpm generate-routes` | Regenerate `src/routeTree.gen.ts`    |

If you're working on the code, read [AGENTS.md](AGENTS.md) first. It covers the architecture and the project's rules.
