import { z } from "zod";
import {
  type Checklist,
  type ChecklistItem,
  withItemStatus,
} from "../checklist";
import { request } from "./api";

const fieldsSchema = z.object({
  fields: z.record(z.string(), z.unknown()),
});

// Only Jira admins may turn notifications off; everyone else gets a 403 for
// asking, so the first refusal switches it off for the rest of the session.
let canSkipNotifications = true;

const putField = async (issueKey: string, fieldId: string, text: string) => {
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

/**
 * Changes one item's status. Issue Checklist Pro picks up edits to its text
 * field and updates the checklist to match. The text is read fresh first, so
 * only this item changes even if the checklist was edited since it loaded.
 */
export const setChecklistItemStatus = async ({
  issueKey,
  fieldId,
  checklist,
  item,
  status,
}: {
  issueKey: string;
  fieldId: string;
  checklist: Checklist;
  item: ChecklistItem;
  status: string;
}) => {
  const { fields } = await request(
    `issue/${issueKey}?fields=${fieldId}`,
    fieldsSchema,
    "atlassian-v2",
  );
  const text = fields[fieldId];
  if (typeof text !== "string") {
    throw new Error("The checklist is no longer on this ticket.");
  }

  const result = withItemStatus(text, checklist, item, status);
  if (!result) {
    throw new Error(`"${item.text}" was removed from the checklist in Jira.`);
  }
  if (result.previous === status) return;
  if (result.previous !== item.status) {
    throw new Error(
      `Someone set "${item.text}" to ${result.previous} in the meantime.`,
    );
  }

  await putField(issueKey, fieldId, result.text);
};
