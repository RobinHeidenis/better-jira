import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { request } from "./api";

const allowedValueSchema = z.looseObject({
  id: z.string().optional(),
  name: z.string().optional(),
  value: z.string().optional(),
});

const transitionFieldSchema = z.object({
  required: z.boolean(),
  name: z.string(),
  schema: z
    .object({
      type: z.string(),
      items: z.string().optional(),
      custom: z.string().optional(),
    })
    .optional(),
  allowedValues: z.array(allowedValueSchema).optional(),
  hasDefaultValue: z.boolean().optional(),
});

export type TransitionField = z.infer<typeof transitionFieldSchema>;

const transitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  to: z.object({
    id: z.string(),
    name: z.string(),
    statusCategory: z.object({ name: z.string() }).optional(),
  }),
  isAvailable: z.boolean().optional(),
  fields: z.record(z.string(), transitionFieldSchema).optional(),
});

export type Transition = z.infer<typeof transitionSchema>;

const transitionsSchema = z.object({ transitions: z.array(transitionSchema) });

export const getTransitions = async (issueKey: string) => {
  const { transitions } = await request(
    `issue/${issueKey}/transitions?expand=transitions.fields`,
    transitionsSchema,
    "atlassian",
  );
  return transitions.filter((transition) => transition.isAvailable !== false);
};

export const transitionsOptions = (issueKey: string) => {
  return queryOptions({
    queryKey: ["issue", issueKey, "transitions"],
    queryFn: () => getTransitions(issueKey),
    staleTime: 5 * 60 * 1000,
  });
};

export const transitionIssue = async (
  issueKey: string,
  transitionId: string,
  fields: Record<string, unknown>,
) => {
  await request(`issue/${issueKey}/transitions`, z.unknown(), "atlassian", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transition: { id: transitionId }, fields }),
  });
};

const assignableUserSchema = z.object({
  accountId: z.string(),
  displayName: z.string(),
  active: z.boolean().optional(),
  avatarUrls: z.object({ "48x48": z.string().nullish() }).optional(),
});

export type AssignableUser = z.infer<typeof assignableUserSchema>;

export const assignableUsersOptions = (issueKey: string) => {
  return queryOptions({
    queryKey: ["issue", issueKey, "assignable-users"],
    queryFn: async () => {
      const users = await request(
        `user/assignable/search?issueKey=${issueKey}&maxResults=500`,
        z.array(assignableUserSchema),
        "atlassian",
      );
      return users.filter((user) => user.active !== false);
    },
    staleTime: 60 * 60 * 1000,
  });
};
