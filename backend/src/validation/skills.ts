import { z } from "zod";

export const CreateSkillSchema = z.object({
  name: z.string().min(1),
});
