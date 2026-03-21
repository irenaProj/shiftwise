import { Router, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { BadRequest, Conflict, NotFound } from "../lib/errors";
import { Ok, Created, NoContent } from "../lib/responses";
import { CreateSkillSchema } from "../validation/skills";

const router = Router({ mergeParams: true });

// GET /api/workspaces/:workspaceId/skills
router.get(
  "/",
  requireAuth,
  requireRole("OWNER", "MANAGER", "EMPLOYEE"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;
      const skills = await prisma.skill.findMany({
        where: { workspaceId },
        orderBy: { name: "asc" },
      });
      Ok(res, skills.map((s) => ({ id: s.id, name: s.name })));
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/workspaces/:workspaceId/skills
router.post(
  "/",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;

      const parsed = CreateSkillSchema.safeParse(req.body);
      if (!parsed.success)
        return next(BadRequest(JSON.stringify(parsed.error.flatten())));

      const { name } = parsed.data;

      const existing = await prisma.skill.findUnique({
        where: { name_workspaceId: { name, workspaceId } },
      });
      if (existing) return next(Conflict("A skill with that name already exists"));

      const skill = await prisma.skill.create({
        data: { name, workspaceId },
      });

      Created(res, { id: skill.id, name: skill.name });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/workspaces/:workspaceId/skills/:skillId
router.delete(
  "/:skillId",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, skillId } = req.params;

      const skill = await prisma.skill.findFirst({
        where: { id: skillId, workspaceId },
      });
      if (!skill) return next(NotFound("Skill not found"));

      await prisma.skill.delete({ where: { id: skillId } });

      NoContent(res);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
