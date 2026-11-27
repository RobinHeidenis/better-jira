import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { store } from "../store";
import { request } from "./api";

const componentSchema = z.object({ id: z.string(), name: z.string() });

export const getComponents = async () => {
  const { project: projectKey } = store.get();
  if (!projectKey)
    throw new Error("No project configured — finish board setup first.");
  return request(
    `project/${projectKey}/components`,
    z.array(componentSchema),
    "atlassian",
  );
};

export const componentsOptions = () =>
  queryOptions({
    queryKey: ["components"],
    queryFn: getComponents,
  });
