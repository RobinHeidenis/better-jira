# better-jira

A faster, nicer front end for Jira Cloud boards and issues, with GitLab merge requests alongside. It is a personal tool for now but will be open sourced, so it must work against any Jira Cloud site, not just the author's.

## Hard rules

- **No tests.** Don't write, add, scaffold or suggest tests, test frameworks or test scripts.
- **Ask before adding a dependency.** That includes shadcn components that pull in new packages.
- **No hardcoded site-specific values.** Custom field IDs (`customfield_*`), user names, initials, issue types, statuses and hosts belong in settings or come from the Jira API.
- **Never edit `src/routeTree.gen.ts`.** The router plugin regenerates it. Run `pnpm generate-routes` if it is stale.

## Verify before you say you're done

```sh
pnpm typecheck && pnpm check
```

Don't start the dev server to verify. If the repo was already failing before your change, make sure you added no new errors, and say which ones were already there.

## Git

Commit finished work straight to `main` using conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`), matching the existing history. One logical change per commit.

## Stack

- TanStack Start (React 19, file-based router, SSR through Nitro), with the React Compiler enabled. Don't sprinkle in `useMemo` or `useCallback`.
- TanStack Query for all server data, persisted to localStorage (`src/integrations/tanstack-query/root-provider.tsx`).
- TanStack Store for user settings (`src/lib/store.ts`).
- Zod 4 for every API response.
- Tailwind v4 and shadcn on base-ui (`components.json`, style `base-lyra`).
- Biome for lint and format (double quotes, 2 spaces). pnpm.

## Conventions

- **Imports:** use the `#/` alias (`#/components/ui/button`), never `@/`.
- **Icons:** use `@remixicon/react`, the shadcn icon library set in `components.json`.
- **UI primitives:** these live in `src/components/ui/` and come from shadcn (`pnpm dlx shadcn@latest add <name>`). Build on them before writing new primitives.
- **Comments:** keep them minimal. Only explain a non-obvious *why*, such as an API quirk, a security reason or a surprising constraint. Don't narrate what the code does.
- **No `console.log` or `console.dir`** left in committed code.

## Architecture

### Jira requests

Atlassian sends no CORS headers, so every Jira call goes through the server function `jiraRequest` in `src/lib/api/api.functions.ts`. Client code calls `request(endpoint, schema, endpointType)` from `src/lib/api/api.ts`:

- `endpointType` picks the API prefix: `"jira"` → `rest/agile/1.0`, `"atlassian"` → `rest/api/3`, `"software"` → `rest/software/1.0`. For board issues, use `software`, because the agile ones are deprecated.
- Credentials live only in the browser. Each request carries `baseUrl` and `apiToken`, where `apiToken` is `base64(email:token)` used for Basic auth.
- `baseUrl` must pass `jiraBaseUrlSchema` (`src/lib/jira-url.ts`), which accepts only https `*.atlassian.net`. This is the SSRF guard on the proxy. Don't loosen it.
- The server function is POST on purpose, so the token never lands in a URL.

GitLab (`src/lib/api/gitlab.ts`) is called straight from the browser against `gitlab.com`, with a personal access token that has the `read_api` and `read_user` scopes.

### Browser extension

`extension/` is a plain-JavaScript Manifest V3 extension, loaded unpacked, with no build step. It redirects Jira ticket links to `/issue/<key>` with `declarativeNetRequest` rules built in `extension/rules.js` from the address set on its options page. Links the app opens Jira with go through `jiraOpenUrl` (`src/lib/jira-url.ts`), which adds the `bj-open=1` marker the extension lets through; links meant for copying use `jiraIssueUrl`.

### API modules

There is one file per resource in `src/lib/api/`. Each defines a Zod schema, a fetch function and a `xxxOptions()` that returns `queryOptions(...)`. Components call `useQuery(xxxOptions(...))`. Follow this shape for anything new.

### Settings store

`src/lib/store.ts` holds the whole settings object, validated by `settingsSchema` and synced to localStorage under `better-jira:settings`.

- If saved settings fail to parse, the store falls back to defaults, which wipes the user's setup. **Any new field must have `.default(...)`** so older saved settings still parse. Add it to `defaults` too.
- The store stays at defaults on the server. A route that reads it during load or render needs `ssr: false`, as the `setup/*` routes do.

### Routes

- `/`: the board. Redirects to setup when the account or board isn't configured.
- `/setup/account`, `/setup/board`, `/setup/gitlab`: setup wizards built on `src/components/ui/questionnaire.tsx`.
- `/issue/$issueId`: issue detail. Tabs for the description, checklist, comments and history (`?tab=`), all rendered from ADF, plus a sidebar.
- `/my-work`: the user's open tickets (`src/lib/api/my-work.ts`, assignee or developer via `cf[id]` JQL) and tickets with GitLab merge requests waiting for their review (`reviewTicketsOptions` in `src/lib/api/merge-request-tickets.ts`, which groups merge requests under the Jira keys they name; the reviewer filter needs the user id from `gitlabUserIdOptions`, read from `/user`) or authored (`authoredMergeRequestsOptions`).
- `/standup`: activity since the previous working day (`lastWorkingDay` in `src/lib/api/standup.ts`). Reviewed tickets come from GitLab (`reviewedMergeRequestsOptions` reads each candidate's notes, since an approval is a system note) grouped by ticket the same way (`reviewedTicketsOptions`); merged merge requests are mapped to tickets the same way (`mergedTicketsOptions`); tickets put on review use a `status CHANGED TO … BY currentUser()` JQL; planned work reads the `startDateField` setting.
- `/settings`: edits the same settings as board setup in place and links to the account and GitLab wizards. A new setting goes in both places.

### ADF (Atlassian Document Format)

Zod node schemas are in `src/lib/adf/` (`block-nodes.ts`, `inline-nodes.ts`). `src/components/adf/adf.tsx` renders a document, with one React component per node type in `src/components/adf/block-nodes/` and `src/components/adf/inline-nodes/`.

- The description is never validated against these schemas (`description.content` is `z.any()`), so components must tolerate missing or odd attrs. Unknown types render the muted "Unsupported content" placeholder from `unsupported.tsx`, and an error boundary per top-level node catches the rest. Pass URLs and colours through `src/lib/adf/sanitize.ts`.
- Media nodes are matched to the issue's attachments in `use-media-attachment.ts`: by filename first, then by the media file id inside each attachment's signed URL. Attachments are passed to `<Adf>` and read via `adf-context.tsx`. Images come through the `jiraAttachmentContent` server function as base64 (10 MB cap). Videos stream from the signed URL that `jiraAttachmentUrl` returns. Both stay out of the persisted query cache.

### Transitions

`src/lib/api/transitions.ts` loads an issue's transitions with their screen fields. `startTransition` in `src/lib/transition.ts` moves the issue straight away when the target lane's form asks for nothing, and otherwise opens the form in `TransitionHost` (`src/components/transition-dialog.tsx`, mounted in the root). The form's fields come from Jira. Per target status, the user can hide fields and save default values, stored in `transitionForms` in settings. Assignee fields offer only the people in the `assigneeShortlist` setting (when set), with "Someone else…" to show everyone. Moves update the cached board and issue first, then reload both. Dragging a card onto a column (`column.tsx`, native drag and drop) picks the transition into that column's first status that has one. Cmd/Shift-clicking cards fills `boardSelection` (`src/lib/board-search.ts`); the bar in `src/components/bulk-actions.tsx` moves them through `startBulkTransition`, which asks the lane's form once for all of them, or sets their assignee or developer with `editIssue`. Dropping a selected card on a column moves the whole selection the same way.

### Finding issues

`IssuePalette` (`src/components/issue-palette.tsx`, mounted in the root) opens on Cmd/Ctrl+K or the board's "Find issue" button (via the `issuePaletteOpen` store) and searches all of Jira through `issueSearchOptions` (`src/lib/api/search.ts`): a key or bare number is looked up directly, and text runs a summary search and a full-text search, merged. An empty query lists `issueHistory()`.

### History

`src/components/history.tsx` renders the issue's change log (`src/lib/api/changelog.ts`, newest first). Changes by app accounts are hidden behind a toggle, one person's changes within five minutes merge into one row showing each field's net change, and checklist edits are diffed per item with `checklistChanges`.

### Editing issues

`editIssue` in `src/lib/edit-issue.ts` saves an edit (`fields` to replace values, `update` for add/remove operations like labels) and shows it on the cached issue and board first. The sidebar's editors are in `src/components/issue-fields.tsx`; people are picked with `PeoplePicker` (`src/components/people-picker.tsx`), shared with transition forms.

### Custom fields

Custom field ids differ per Jira site. The developer, story points, checklist and start date fields are picked during board setup and stored as `developerField`, `storyPointsField`, `checklistField` and `startDateField`. The checklist is Issue Checklist Pro's text field, parsed in `src/lib/checklist.ts`. Ticking an item rewrites its line in a fresh copy of the field through API v2 (`src/lib/api/checklist.ts`), and the app syncs its checklist from the field. The app also writes the field back a few seconds later, which undoes any write made in between, so `src/lib/checklist-sync.ts` batches clicks and new items (inserted at the end of a group, found by position and title via `withAddedItem`) and re-checks after each write. The status menu offers the `checklistStatuses` setting plus any status the checklist already uses (`src/components/checklist.tsx`), because the app has no API for its configured statuses. `src/lib/api/issues.ts` requests them by id and parses them out of the loose `fields` object (`issueDeveloper`, `issueStoryPoints`). When a setting is null, the UI hides that part.

<!-- intent-skills:start -->
## Skill Loading

Before editing files for a substantial task:
- Run `pnpm dlx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->
