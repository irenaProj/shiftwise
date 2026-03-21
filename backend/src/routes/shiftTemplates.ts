import { Router, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { BadRequest, NotFound } from "../lib/errors";
import { Ok, Created, NoContent } from "../lib/responses";
import { CreateShiftTemplateSchema } from "../validation/shiftTemplates";

const router = Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/shift-templates
router.get(
  "/",
  requireAuth,
  requireRole("OWNER", "MANAGER", "EMPLOYEE"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;
      const templates = await prisma.shiftTemplate.findMany({
        where: { workspaceId },
        orderBy: { startTime: "asc" },
      });
      Ok(res, templates.map((t) => ({
        id: t.id,
        name: t.name,
        startTime: t.startTime,
        endTime: t.endTime,
      })));
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/workspaces/:workspaceId/shift-templates
router.post(
  "/",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;

      const parsed = CreateShiftTemplateSchema.safeParse(req.body);
      if (!parsed.success)
        return next(BadRequest(JSON.stringify(parsed.error.flatten())));

      const { name, startTime, endTime } = parsed.data;

      const template = await prisma.shiftTemplate.create({
        data: { name, startTime, endTime, workspaceId },
      });

      Created(res, {
        id: template.id,
        name: template.name,
        startTime: template.startTime,
        endTime: template.endTime,
      });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/workspaces/:workspaceId/shift-templates/:templateId
router.delete(
  "/:templateId",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, templateId } = req.params;

      const template = await prisma.shiftTemplate.findFirst({
        where: { id: templateId, workspaceId },
      });
      if (!template) return next(NotFound("Shift template not found"));

      await prisma.shiftTemplate.delete({ where: { id: templateId } });

      NoContent(res);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
