import { z } from "zod";

const HHmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Must be HH:mm");

export const UpsertForecastSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  time: HHmm,
  required: z.number().int().min(1),
});
