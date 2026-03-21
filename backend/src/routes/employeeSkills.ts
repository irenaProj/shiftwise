import { Router, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { BadRequest, Conflict, NotFound } from "../lib/errors";
import { Ok, Created, NoContent } from "../lib/responses";
import { AddEmployeeSkillSchema } from "../validation/employeeSkills";

const router = Router({ mergeParams: true });

async function resolveMembership(workspaceId: string, userId: string) {
  return prisma.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  });
}

// GET /api/workspaces/:workspaceId/employees/:userId/skills
router.get(
  "/",
  requireAuth,
  requireRole("OWNER", "MANAGER", "EMPLOYEE"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = req.params;

      const membership = await resolveMembership(workspaceId, userId);
      if (!membership) return next(NotFound("Employee not found in this workspace"));

      const membershipSkills = await prisma.membershipSkill.findMany({
        where: { membershipId: membership.id },
        include: { skill: true },
      });

      Ok(res, membershipSkills.map((ms) => ({ id: ms.skill.id, name: ms.skill.name })));
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/workspaces/:workspaceId/employees/:userId/skills
router.post(
  "/",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = req.params;

      const parsed = AddEmployeeSkillSchema.safeParse(req.body);
      if (!parsed.success)
        return next(BadRequest(JSON.stringify(parsed.error.flatten())));

      const { skillId } = parsed.data;

      const membership = await resolveMembership(workspaceId, userId);
      if (!membership) return next(NotFound("Employee not found in this workspace"));

      const skill = await prisma.skill.findFirst({
        where: { id: skillId, workspaceId },
      });
      if (!skill) return next(NotFound("Skill not found in this workspace"));

      const existing = await prisma.membershipSkill.findUnique({
        where: { membershipId_skillId: { membershipId: membership.id, skillId } },
      });
      if (existing) return next(Conflict("Employee already has this skill"));

      await prisma.membershipSkill.create({
        data: { membershipId: membership.id, skillId },
      });

      Created(res, { id: skill.id, name: skill.name });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/workspaces/:workspaceId/employees/:userId/skills/:skillId
router.delete(
  "/:skillId",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId, skillId } = req.params;

      const membership = await resolveMembership(workspaceId, userId);
      if (!membership) return next(NotFound("Employee not found in this workspace"));

      const membershipSkill = await prisma.membershipSkill.findUnique({
        where: { membershipId_skillId: { membershipId: membership.id, skillId } },
      });
      if (!membershipSkill) return next(NotFound("Employee does not have this skill"));

      await prisma.membershipSkill.delete({
        where: { membershipId_skillId: { membershipId: membership.id, skillId } },
      });

      NoContent(res);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
