import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import bcrypt from "bcryptjs";

const router = Router();

const AddEmployeeSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["MANAGER", "EMPLOYEE"]).default("EMPLOYEE"),
  password: z.string().min(8).default("changeme123"),
});

// GET /api/workspaces/:workspaceId/employees
// Any workspace member can list employees
router.get(
  "/:workspaceId/employees",
  requireAuth,
  requireRole("OWNER", "MANAGER", "EMPLOYEE"),
  async (req: AuthRequest, res: Response) => {
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

    res.json(
      members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        timezone: m.user.timezone,
        role: m.role,
        joinedAt: m.createdAt,
      })),
    );
  },
);

// POST /api/workspaces/:workspaceId/employees
// Only managers and owners can add employees
router.post(
  "/:workspaceId/employees",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  async (req: AuthRequest, res: Response) => {
    const { workspaceId } = req.params;

    const parsed = AddEmployeeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { email, name, role, password } = parsed.data;

    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const existingMembership = await prisma.membership.findUnique({
        where: { userId_workspaceId: { userId: user.id, workspaceId } },
      });
      if (existingMembership) {
        res
          .status(409)
          .json({ error: "User is already a member of this workspace" });
        return;
      }
    } else {
      const passwordHash = await bcrypt.hash(password, 12);
      user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          timezone: req.membership!.workspace.timezone, // inherit workspace timezone
        },
      });
    }

    const membership = await prisma.membership.create({
      data: { userId: user.id, workspaceId, role },
      include: {
        user: { select: { id: true, name: true, email: true, timezone: true } },
      },
    });

    res.status(201).json({
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      timezone: membership.user.timezone,
      role: membership.role,
      joinedAt: membership.createdAt,
    });
  },
);

// DELETE /api/workspaces/:workspaceId/employees/:userId
// Only managers and owners can remove employees
router.delete(
  "/:workspaceId/employees/:userId",
  requireAuth,
  requireRole("OWNER", "MANAGER"),
  async (req: AuthRequest, res: Response) => {
    const { workspaceId, userId } = req.params;

    // Prevent self-removal
    if (userId === req.user!.id) {
      res
        .status(400)
        .json({ error: "You cannot remove yourself from the workspace" });
      return;
    }

    await prisma.membership.delete({
      where: { userId_workspaceId: { userId, workspaceId } },
    });

    res.json({ ok: true });
  },
);

export default router;
