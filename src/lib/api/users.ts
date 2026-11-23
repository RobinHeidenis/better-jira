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
