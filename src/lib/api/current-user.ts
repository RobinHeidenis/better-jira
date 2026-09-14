import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { request } from "./api";

const currentUserSchema = z.object({
  accountId: z.string(),
  avatarUrls: z.object({
    "16x16": z.url(),
    "24x24": z.url(),
    "32x32": z.url(),
    "48x48": z.url(),
  }),
  displayName: z.string(),
  emailAddress: z.email(),
});

export const getCurrentUser = async () => {
  return await request("myself", currentUserSchema, "atlassian");
};

export const currentUserOptions = () => {
  return queryOptions({
    queryKey: ["current-user"],
    queryFn: getCurrentUser,
  });
};
