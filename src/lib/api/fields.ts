import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { request } from "./api";

const fieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  custom: z.boolean(),
  schema: z
    .object({
      type: z.string(),
    })
    .optional(),
});

export type JiraField = z.infer<typeof fieldSchema>;

export const getFields = async () => {
  return await request("field", z.array(fieldSchema), "atlassian");
};

export const fieldsOptions = () => {
  return queryOptions({
    queryKey: ["fields"],
    queryFn: getFields,
  });
};
