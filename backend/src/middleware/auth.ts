import { Request, Response, NextFunction } from "express";
import { User, Membership, Workspace } from "@prisma/client";
import { verifyAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

export interface AuthRequest extends Request {
  user?: User;
  membership?: Membership & { workspace: Workspace };
}

// ── Layer 1: Authentication ──────────────────────────────────────────────────
// Verifies the Bearer token and attaches the full User to req.user
// Returns 401 if token is missing, invalid, or expired

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      res.status(401).json({ error: "User no longer exists" });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired access token" });
  }
}

// ── Layer 2: Authorization ───────────────────────────────────────────────────
// Verifies the caller is a member of the workspace with one of the allowed roles
// Attaches the full Membership + Workspace to req.membership
// Must be used after requireAuth and on routes with :workspaceId param
// Returns 403 if not a member or role is insufficient

export function requireRole(...roles: Array<"OWNER" | "MANAGER" | "EMPLOYEE">) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { workspaceId } = req.params;

    if (!workspaceId) {
      res.status(400).json({ error: "workspaceId param is required" });
      return;
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: req.user!.id,
          workspaceId,
        },
      },
      include: { workspace: true },
    });

    if (!membership) {
      res.status(403).json({ error: "Not a member of this workspace" });
      return;
    }

    if (!roles.includes(membership.role)) {
      res.status(403).json({ error: `Requires one of: ${roles.join(", ")}` });
      return;
    }

    req.membership = membership;
    next();
  };
}
