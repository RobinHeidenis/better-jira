import { z } from "zod";
import type { Transition, TransitionField } from "./api/transitions";

/**
 * A value in a transition form, kept in a shape that can be shown again, so
 * it can be saved as a default for the lane.
 */
export const formValueSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("me") }),
  z.object({ kind: z.literal("unassigned") }),
  z.object({
    kind: z.literal("user"),
    accountId: z.string(),
    displayName: z.string(),
  }),
  z.object({ kind: z.literal("option"), id: z.string(), label: z.string() }),
  z.object({
    kind: z.literal("options"),
    items: z.array(z.object({ id: z.string(), label: z.string() })),
  }),
  z.object({ kind: z.literal("text"), text: z.string() }),
  z.object({ kind: z.literal("number"), number: z.number() }),
]);

export type FormValue = z.infer<typeof formValueSchema>;
export type FormValues = Record<string, FormValue | undefined>;

/** What the user configured for transitions into one status. */
export const transitionFormSchema = z.object({
  status: z.string(),
  hidden: z.array(z.string()),
  defaults: z.record(z.string(), formValueSchema.catch({ kind: "unassigned" })),
});

export type TransitionFormConfig = z.infer<typeof transitionFormSchema>;

export type FieldKind =
  | "user"
  | "option"
  | "options"
  | "text"
  | "textarea"
  | "number";

/** How a field can be edited here, or null when it can't be. */
export const fieldKind = (field: TransitionField): FieldKind | null => {
  const schema = field.schema;
  if (!schema) return null;
  // Message fields only show text on Jira's screen.
  if (schema.custom?.endsWith(":message")) return null;
  if (schema.type === "user") return "user";
  if (schema.type === "array") return field.allowedValues ? "options" : null;
  if (field.allowedValues) return "option";
  if (schema.type === "string") {
    return schema.custom?.endsWith(":textarea") ? "textarea" : "text";
  }
  if (schema.type === "number") return "number";
  return null;
};

export const optionLabel = (option: {
  id?: string;
  name?: string;
  value?: string;
}) => option.value ?? option.name ?? option.id ?? "";

export type FormField = {
  key: string;
  field: TransitionField;
  kind: FieldKind | null;
};

export const formFields = (transition: Transition): FormField[] =>
  Object.entries(transition.fields ?? {})
    .map(([key, field]) => ({ key, field, kind: fieldKind(field) }))
    .filter(
      // Display-only fields aren't worth a row, unless Jira insists.
      (entry) =>
        entry.kind !== null ||
        (entry.field.required && !entry.field.hasDefaultValue),
    );

export const isEmpty = (value: FormValue | undefined) =>
  !value ||
  (value.kind === "text" && !value.text.trim()) ||
  (value.kind === "options" && !value.items.length);

/** Fields Jira requires that have no value yet. */
export const missingFields = (fields: FormField[], values: FormValues) =>
  fields.filter(
    (entry) =>
      entry.field.required &&
      !entry.field.hasDefaultValue &&
      isEmpty(values[entry.key]),
  );
