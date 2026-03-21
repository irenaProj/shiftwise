import { z } from "zod";

export const AddEmployeeSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
  password: z.string().min(8).default("changeme123"),
});
