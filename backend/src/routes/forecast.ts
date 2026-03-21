import { Router, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { BadRequest, NotFound } from "../lib/errors";
import { Ok, NoContent } from "../lib/responses";
import { UpsertForecastSlotSchema } from "../validation/forecast";

const router = Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/forecast
router.get(
  "/",
  requireAuth,
  requireRole("OWNER", "MANAGER", "EMPLOYEE"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;
      const slots = await prisma.forecastSlot.findMany({
        where: { workspaceId },
        orderBy: [{ dayOfWeek: "asc" }, { time: "asc" }],
      });
      Ok(res, slots.map((s) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        time: s.time,
        required: s.required,
      })));
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/workspaces/:workspaceId/forecast
// Creates or updates the slot for the given dayOfWeek + time.
router.put(
  "/",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;

      const parsed = UpsertForecastSlotSchema.safeParse(req.body);
      if (!parsed.success)
        return next(BadRequest(JSON.stringify(parsed.error.flatten())));

      const { dayOfWeek, time, required } = parsed.data;

      const slot = await prisma.forecastSlot.upsert({
        where: { workspaceId_dayOfWeek_time: { workspaceId, dayOfWeek, time } },
        update: { required },
        create: { workspaceId, dayOfWeek, time, required },
      });

      Ok(res, { id: slot.id, dayOfWeek: slot.dayOfWeek, time: slot.time, required: slot.required });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/workspaces/:workspaceId/forecast/:slotId
router.delete(
  "/:slotId",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, slotId } = req.params;

      const slot = await prisma.forecastSlot.findFirst({
        where: { id: slotId, workspaceId },
      });
      if (!slot) return next(NotFound("Forecast slot not found"));

      await prisma.forecastSlot.delete({ where: { id: slotId } });

      NoContent(res);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
