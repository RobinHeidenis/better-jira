import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { store } from "../store";
import { request } from "./api";

const userSchema = z.object({
  accountId: z.string(),
  accountType: z.enum(["atlassian", "app", "customer", "unknown"]),
  active: z.boolean(),
  avatarUrls: z.object({
    "16x16": z.url(),
    "24x24": z.url(),
    "32x32": z.url(),
    "48x48": z.url(),
  }),
  displayName: z.string(),
  emailAddress: z.string().nullish(),
});

const getUsersResponseSchema = z.object({
  values: z.array(userSchema),
});

export const getUsers = async () => {
  const { project: projectKey } = store.get();
  if (!projectKey)
    throw new Error("No project configured — finish board setup first.");
  return (
    await request("user/search/query", getUsersResponseSchema, "atlassian", {
      query: { query: `is assignee of ${projectKey}` },
    })
  ).values;
};

export const usersOptions = () => {
  return queryOptions({
    queryKey: ["users"],
    queryFn: getUsers,
  });
};

const assignableUserSchema = z.object({
  accountId: z.string(),
  accountType: z.string().optional(),
  active: z.boolean().optional(),
  displayName: z.string(),
  avatarUrls: z.object({ "48x48": z.string().nullish() }).optional(),
});

/** Everyone who can be assigned in the project, apps left out. */
export const projectAssignableUsersOptions = (projectKey: string | null) => {
  return queryOptions({
    queryKey: ["project-assignable-users", projectKey],
    queryFn: async () => {
      const users = await request(
        `user/assignable/multiProjectSearch?projectKeys=${projectKey}&maxResults=1000`,
        z.array(assignableUserSchema),
        "atlassian",
      );
      return users
        .filter((user) => user.active !== false && user.accountType !== "app")
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
    },
    enabled: !!projectKey,
    staleTime: 60 * 60 * 1000,
  });
};
