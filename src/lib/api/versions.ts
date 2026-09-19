import { z } from "zod";
import { request } from "./api";
import { queryOptions } from "@tanstack/react-query";
import { store } from "../store";

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
  const projectKey = store.get().project!;
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
