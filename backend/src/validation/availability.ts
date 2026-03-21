import { z } from "zod";

const HHmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:mm");

export const CreateAvailabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: HHmm,
  endTime: HHmm,
});
