import { Router, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { BadRequest, NotFound } from "../lib/errors";
import { Ok, NoContent } from "../lib/responses";
import { CreateAvailabilitySchema } from "../validation/availability";

const router = Router({ mergeParams: true });

async function resolveMembership(workspaceId: string, userId: string) {
  return prisma.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
}

// GET /api/workspaces/:workspaceId/employees/:userId/availability
router.get(
  "/",
  requireAuth,
  requireRole("OWNER", "MANAGER", "EMPLOYEE"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = req.params;

      const membership = await resolveMembership(workspaceId, userId);
      if (!membership) return next(NotFound("Employee not found in this workspace"));

      const windows = await prisma.availability.findMany({
        where: { membershipId: membership.id },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });

      Ok(res, windows.map((w) => ({
        id: w.id,
        dayOfWeek: w.dayOfWeek,
        startTime: w.startTime,
        endTime: w.endTime,
      })));
    } catch (err) {
      next(err);
    }
  },
);

// PUT /api/workspaces/:workspaceId/employees/:userId/availability
// Creates or updates the window for the given dayOfWeek + startTime.
router.put(
  "/",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = req.params;

      const parsed = CreateAvailabilitySchema.safeParse(req.body);
      if (!parsed.success)
        return next(BadRequest(JSON.stringify(parsed.error.flatten())));

      const { dayOfWeek, startTime, endTime } = parsed.data;

      const membership = await resolveMembership(workspaceId, userId);
      if (!membership) return next(NotFound("Employee not found in this workspace"));

      const window = await prisma.availability.upsert({
        where: {
          membershipId_dayOfWeek_startTime: {
            membershipId: membership.id,
            dayOfWeek,
            startTime,
          },
        },
        update: { endTime },
        create: { membershipId: membership.id, dayOfWeek, startTime, endTime },
      });

      Ok(res, {
        id: window.id,
        dayOfWeek: window.dayOfWeek,
        startTime: window.startTime,
        endTime: window.endTime,
      });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/workspaces/:workspaceId/employees/:userId/availability/:availabilityId
router.delete(
  "/:availabilityId",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId, availabilityId } = req.params;

      const membership = await resolveMembership(workspaceId, userId);
      if (!membership) return next(NotFound("Employee not found in this workspace"));

      const window = await prisma.availability.findFirst({
        where: { id: availabilityId, membershipId: membership.id },
      });
      if (!window) return next(NotFound("Availability window not found"));

      await prisma.availability.delete({ where: { id: availabilityId } });

      NoContent(res);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
