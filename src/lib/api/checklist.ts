import { z } from "zod";
import { request } from "./api";

const fieldsSchema = z.object({
  fields: z.record(z.string(), z.unknown()),
});

/** The field's raw text. API v2 sends it as a string rather than ADF. */
export const getChecklistText = async (issueKey: string, fieldId: string) => {
  const { fields } = await request(
    `issue/${issueKey}?fields=${fieldId}`,
    fieldsSchema,
    "atlassian-v2",
  );
  const text = fields[fieldId];
  if (typeof text !== "string") {
    throw new Error("The checklist is no longer on this ticket.");
  }
  return text;
};

// Only Jira admins may turn notifications off; everyone else gets a 403 for
// asking, so the first refusal switches it off for the rest of the session.
let canSkipNotifications = true;

export const putChecklistText = async (
  issueKey: string,
  fieldId: string,
  text: string,
) => {
  const body = JSON.stringify({ fields: { [fieldId]: text } });
  const put = (query?: Record<string, string>) =>
    request(`issue/${issueKey}`, z.unknown(), "atlassian-v2", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body,
      query,
    });

  if (canSkipNotifications) {
    try {
      return await put({ notifyUsers: "false" });
    } catch (error) {
      if (!(error instanceof Error && /failed: 403\b/.test(error.message))) {
        throw error;
      }
      canSkipNotifications = false;
    }
  }
  return await put();
};
