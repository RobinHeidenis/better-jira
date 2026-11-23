import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { store } from "../store";
import { request } from "./api";

const versionSchema = z.object({
  id: z.string(),
  name: z.string(),
  archived: z.boolean(),
  released: z.boolean(),
});

const getVersionsResponseSchema = z.object({
  values: z.array(versionSchema),
});

export const getVersions = async () => {
  const { project: projectKey } = store.get();
  if (!projectKey)
    throw new Error("No project configured — finish board setup first.");
  return (
    await request(
      `project/${projectKey}/version`,
      getVersionsResponseSchema,
      "atlassian",
      {
        query: { status: "unreleased" },
      },
    )
  ).values;
};

export const versionOptions = () => {
  return queryOptions({
    queryKey: ["versions"],
    queryFn: getVersions,
  });
};
