import { z } from "zod";

export const AddEmployeeSkillSchema = z.object({
  skillId: z.string().min(1),
});
