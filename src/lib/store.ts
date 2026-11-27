import { createStore } from "@tanstack/react-store";
import { z } from "zod";
import { jiraBaseUrlSchema } from "./jira-url";
import { transitionFormSchema } from "./transition-form";

const STORAGE_KEY = "better-jira:settings";

const settingsSchema = z.object({
  apiToken: z.string().nullable(),
  baseUrl: jiraBaseUrlSchema.nullable(),
  boardId: z.number().nullable(),
  project: z.string().nullable(),
  hiddenColumns: z.array(z.string()).nullable(),
  developerField: z.string().nullable(),
  storyPointsField: z.string().nullable().default(null),
  startDateField: z.string().nullable().default(null),
  checklistStatuses: z
    .array(z.string())
    .default(["Open", "In Progress", "Done", "Skipped"]),
  reviewColumn: z.string().nullable().default(null),
  checklistField: z.string().nullable().default(null),
  onlyMine: z.boolean().default(false),
  includeDevTickets: z.boolean().nullable(),
  filter: z
    .object({
      users: z.array(z.string()).nullish(),
      versions: z.array(z.string()).nullish(),
    })
    .nullable(),
  // Defaulted so settings saved before GitLab support still parse instead of
  // resetting the whole store.
  gitlabApiKey: z.string().nullable().default(null),
  gitlabProjects: z.array(z.number()).nullable().default(null),
  /** The people offered first when picking an assignee; empty offers everyone. */
  assigneeShortlist: z.array(z.string()).default([]),
  /** Transition forms, by the id of the status they move to. */
  transitionForms: z
    .record(z.string(), transitionFormSchema)
    .catch({})
    .default({}),
});

export type Settings = z.infer<typeof settingsSchema>;

const defaults: Settings = {
  apiToken: null,
  baseUrl: null,
  boardId: null,
  project: null,
  hiddenColumns: null,
  developerField: null,
  storyPointsField: null,
  startDateField: null,
  checklistStatuses: ["Open", "In Progress", "Done", "Skipped"],
  reviewColumn: null,
  checklistField: null,
  onlyMine: false,
  includeDevTickets: null,
  filter: null,
  gitlabApiKey: null,
  gitlabProjects: null,
  assigneeShortlist: [],
  transitionForms: {},
};

/**
 * Anything unreadable — absent, hand-edited, or written by an older shape of
 * this store — falls back to the defaults rather than throwing, so a bad entry
 * costs the user a re-run of setup instead of a blank page.
 */
function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;

    const result = settingsSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : defaults;
  } catch {
    return defaults;
  }
}

export const store = createStore<Settings>(defaults);

// The server keeps the defaults: localStorage is browser-only, and a
// module-level store on the server is shared by every request anyway, so
// credentials must never land in it.
if (typeof window !== "undefined") {
  // Reading at module load rather than in an effect means the value is already
  // in place before the first render and before any route guard reads it.
  store.setState(readSettings);

  store.subscribe((settings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // A blocked or full quota shouldn't take the app down; the settings just
      // stay in memory for this tab.
    }
  });

  // A null key means the whole store was cleared, which counts as a change here.
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    store.setState(readSettings);
  });
}
