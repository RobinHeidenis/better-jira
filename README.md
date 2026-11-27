# better-jira

A faster front end for Jira Cloud boards and tickets, with GitLab merge requests next to the work they belong to. It works against any Jira Cloud site.

## What it does

- **Board.** Every column of a board on one screen. Only the cards you can see are rendered, so boards with hundreds of tickets stay quick.
- **Filters and search.** Filter by user, by fix version, or with "Mine" for tickets assigned to you or developed by you. Cmd/Ctrl+F searches every ticket on the board, including off-screen ones, and Enter jumps between matches.
- **Code review ordering.** Pick a code review column in settings, and it lists reviews waiting on you first, then your own work, then tickets you reported.
- **Ticket view.** The full description, including tables, code blocks, Mermaid diagrams, images and videos. A sidebar has status, people, parent, subtasks and linked tickets. Assignee, developer, priority, story points, fix versions and labels can be edited there with a click, and assignee and developer also from the chips on a card.
- **Checklists.** If your site uses Issue Checklist Pro, the checklist shows in its own tab, grouped, with progress. Custom statuses like "done by dev" are shown separately from done. Click a box to tick it off, "Check all" ticks off everything left, or use the menu next to an item to pick another status (Open, In Progress, done by dev, Done or Skipped). The change is saved to Jira, and Issue Checklist Pro picks it up.
- **Moving tickets.** Change a ticket's status from the sidebar, from the button on a card, with `s` on the board, or by dragging a card to another column. Transitions with a form in Jira open the same form here, and per lane you can choose which fields it asks for and set defaults, or skip the form entirely. An assignee shortlist in settings keeps the people picker to the people you actually assign.
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

## Hosting with Docker

The repo has a `Dockerfile` and a `compose.yaml`. The image builds the app and runs it on Node, listening on port 3000.

```sh
docker compose up -d --build
```

On Komodo, create a Stack from this repo. It picks up `compose.yaml`, builds the image on your server and keeps it running. Change the left side of `"3000:3000"` to publish it on another port.

GitHub Actions also builds the image on every push to `main` and publishes it to the GitHub Container Registry as `ghcr.io/<owner>/<repo>:latest`, for both amd64 and arm64. A `v1.2.3` tag adds `1.2.3` and `1.2`, and every build gets a `sha-…` tag you can pin or roll back to. To run the published image instead of building on your server, replace `build: .` in `compose.yaml` with that image name. If the repo is private, the package is too, so log your server in to `ghcr.io` with a token that has `read:packages`.

Put it behind your reverse proxy with HTTPS. Your tokens travel from the browser to this server on every Jira request, so plain HTTP on a network you don't control would expose them. The server only forwards to `*.atlassian.net` with the caller's own token, but it's still best kept on a private network or behind your proxy's login.

## Where your credentials go

Your Jira and GitLab tokens stay in your browser's local storage. GitLab is called straight from the browser. Jira calls go through this app's own server, because Atlassian's REST API sends no CORS headers. That server only forwards requests to `*.atlassian.net` and stores nothing.

## Keyboard shortcuts

Anywhere, `Cmd/Ctrl+K` finds any ticket you can see in Jira, not just the ones on the board. Search by key, by number alone (for the board's project) or by text. With nothing typed, it lists the tickets you viewed most recently.

On the board:

| Key            | Action                                  |
| -------------- | --------------------------------------- |
| `j` / `k`      | Next or previous card in the column     |
| `h` / `l`      | Previous or next column                 |
| `Enter` or `o` | Open the selected card                  |
| `s`            | Change the selected card's status       |
| `a` / `d`      | Change the selected card's assignee or developer |
| `/`            | Search the board                        |
| `Cmd/Ctrl+F`   | Search the board (press again for the browser's own find) |

On a ticket:

| Key           | Action                                   |
| ------------- | ---------------------------------------- |
| `s`           | Change the status                        |
| `a` / `d`     | Change the assignee or developer         |
| `p`           | Change the priority                      |
| `l` / `v`     | Edit the labels or fix versions          |
| `c`           | Write a comment                          |
| `1` `2` `3`   | Description, checklist and comments tabs |
| `e`           | Open the ticket in Jira                  |
| `y`           | Copy the link to the ticket              |
| `Esc`         | Back to the board                        |

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
