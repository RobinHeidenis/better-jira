import { z } from "zod";
import { request } from "./api";
import { queryOptions } from "@tanstack/react-query";
import { store } from "../store";

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
  const projectKey = store.get().project!;
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
