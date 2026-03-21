import { z } from "zod";

const HHmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:mm");

export const CreateShiftTemplateSchema = z.object({
  name: z.string().min(1),
  startTime: HHmm,
  endTime: HHmm,
});
