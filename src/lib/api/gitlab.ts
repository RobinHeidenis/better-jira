import { queryOptions, skipToken } from "@tanstack/react-query";
import { z } from "zod";
import { store } from "../store";

const request = async <TSchema extends z.ZodType>(
  endpoint: string,
  schema: TSchema,
  options: RequestInit = {},
  token = store.get().gitlabApiKey,
) => {
  const url = `https://gitlab.com/api/v4${endpoint}`;

  if (token) {
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`GitLab error: ${response.status} ${response.statusText}`);
  }

  return schema.parse(await response.json());
};

const projectSchema = z.object({
  id: z.number(),
  name_with_namespace: z.string(),
});

const getProjects = async (token: string) =>
  await request(
    "/projects?membership=true&simple=true&active=true&per_page=100",
    z.array(projectSchema),
    {},
    token,
  );

// Setup lists projects for a token that isn't saved yet, so it is passed in
// rather than read from the store.
export const gitlabProjectsOptions = (token: string | null) => {
  return queryOptions({
    queryKey: ["gitlab-projects", token],
    queryFn: token ? () => getProjects(token) : skipToken,
    retry: false,
  });
};
