import { Request, Response, NextFunction } from "express";
import { User, Membership, Workspace } from "@prisma/client";
import { verifyAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { Unauthorized, Forbidden, BadRequest } from "../lib/errors";

export interface AuthRequest extends Request {
  user?: User;
  membership?: Membership & { workspace: Workspace };
}

export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(Unauthorized("Missing or invalid Authorization header"));
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    if (!user) return next(Unauthorized("User no longer exists"));
    req.user = user;
    next();
  } catch {
    next(Unauthorized("Invalid or expired access token"));
  }
}

export function requireRole(...roles: Array<"OWNER" | "MANAGER" | "EMPLOYEE">) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { workspaceId } = req.params;

    if (!workspaceId) return next(BadRequest("workspaceId param is required"));

    const membership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: req.user!.id, workspaceId } },
      include: { workspace: true },
    });

    if (!membership) return next(Forbidden("Not a member of this workspace"));

    if (!roles.includes(membership.role)) {
      return next(Forbidden(`Requires one of: ${roles.join(", ")}`));
    }

    req.membership = membership;
    next();
  };
}
