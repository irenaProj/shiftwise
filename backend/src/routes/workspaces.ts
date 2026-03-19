import { Router, Response, NextFunction } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { BadRequest, Conflict } from "../lib/errors";
import { Ok, Created, NoContent } from "../lib/responses";

const router = Router();

const AddEmployeeSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
  password: z.string().min(8).default("changeme123"),
});

// GET /api/workspaces/:workspaceId/employees
router.get(
  "/:workspaceId/employees",
  requireAuth,
  requireRole("OWNER", "MANAGER", "EMPLOYEE"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;
      const members = await prisma.membership.findMany({
        where: { workspaceId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              timezone: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      Ok(
        res,
        members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          timezone: m.user.timezone,
          role: m.role,
          joinedAt: m.createdAt,
        })),
      );
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/workspaces/:workspaceId/employees
router.post(
  "/:workspaceId/employees",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = req.params;

      const parsed = AddEmployeeSchema.safeParse(req.body);
      if (!parsed.success)
        return next(BadRequest(JSON.stringify(parsed.error.flatten())));

      const { email, name, role, password } = parsed.data;

      let user = await prisma.user.findUnique({ where: { email } });

      if (user) {
        const existingMembership = await prisma.membership.findUnique({
          where: { userId_workspaceId: { userId: user.id, workspaceId } },
        });
        if (existingMembership)
          return next(Conflict("User is already a member of this workspace"));
      } else {
        const passwordHash = await bcrypt.hash(password, 12);
        user = await prisma.user.create({
          data: {
            email,
            name,
            passwordHash,
            timezone: req.membership!.workspace.timezone,
          },
        });
      }

      const membership = await prisma.membership.create({
        data: { userId: user.id, workspaceId, role },
        include: {
          user: {
            select: { id: true, name: true, email: true, timezone: true },
          },
        },
      });

      Created(res, {
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        timezone: membership.user.timezone,
        role: membership.role,
        joinedAt: membership.createdAt,
      });
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/workspaces/:workspaceId/employees/:userId
router.delete(
  "/:workspaceId/employees/:userId",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = req.params;

      if (userId === req.user!.id) {
        return next(
          BadRequest("You cannot remove yourself from the workspace"),
        );
      }

      await prisma.membership.delete({
        where: { userId_workspaceId: { userId, workspaceId } },
      });

      NoContent(res);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
