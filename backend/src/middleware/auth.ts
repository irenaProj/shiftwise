/**
 * @module middleware/auth
 * @description
 * Two-layer authentication and authorisation middleware.
 *
 * **Layer 1 — `requireAuth`:** Verifies the Bearer token and attaches the full
 * `User` record to `req.user`. Returns `401` if the token is missing, invalid,
 * or expired.
 *
 * **Layer 2 — `requireRole`:** Verifies the caller is a member of the target
 * workspace with one of the allowed roles. Attaches the full `Membership` and
 * `Workspace` to `req.membership`. Returns `403` if not a member or insufficient role.
 *
 * Both middlewares attach data to the request so route handlers never need
 * extra DB reads to get user or workspace information.
 *
 * @example
 * // Protect a route — authentication + role check in one line
 * router.delete('/:workspaceId/employees/:userId',
 *   requireAuth,
 *   requireRole('OWNER', 'MANAGER'),
 *   handler
 * )
 */

import { Request, Response, NextFunction } from "express";
import { User, Membership, Workspace } from "@prisma/client";
import { verifyAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";
import { Unauthorized, Forbidden, BadRequest } from "../lib/errors";

/**
 * Extended Express request with authenticated user and workspace membership.
 * Populated by `requireAuth` and `requireRole` middleware respectively.
 */
export interface AuthRequest extends Request {
  /**
   * The authenticated user record from the database.
   * Populated by `requireAuth` — available on all protected routes.
   */
  user?: User;
  /**
   * The caller's membership record including the full workspace.
   * Populated by `requireRole` — available on workspace-scoped routes.
   */
  membership?: Membership & { workspace: Workspace };
}

/**
 * Authentication middleware — Layer 1 of 2.
 *
 * Extracts the Bearer token from the `Authorization` header, verifies it,
 * and fetches the corresponding user from the database. Attaches the full
 * `User` record to `req.user` for downstream handlers.
 *
 * Calls `next(Unauthorized(...))` if:
 * - The `Authorization` header is missing or malformed
 * - The token is expired or has an invalid signature
 * - The user no longer exists in the database
 *
 * @example
 * router.get('/profile', requireAuth, (req: AuthRequest, res) => {
 *   Ok(res, { name: req.user!.name })
 * })
 */
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

/**
 * Authorisation middleware factory — Layer 2 of 2.
 *
 * Returns a middleware that verifies the authenticated user is a member of the
 * workspace in `:workspaceId` with one of the specified roles. Attaches the
 * full `Membership` (including `workspace`) to `req.membership`.
 *
 * Must be used **after** `requireAuth` since it relies on `req.user`.
 *
 * Calls `next(Forbidden(...))` if:
 * - The user is not a member of the workspace
 * - The user's role is not in the allowed `roles` list
 *
 * @param roles - One or more roles that are permitted to access the route
 * @returns Express middleware function
 *
 * @example
 * // Only owners and managers can add employees
 * router.post('/:workspaceId/employees',
 *   requireAuth,
 *   requireRole('OWNER', 'MANAGER'),
 *   addEmployeeHandler
 * )
 *
 * // Any workspace member can view the schedule
 * router.get('/:workspaceId/schedule',
 *   requireAuth,
 *   requireRole('OWNER', 'MANAGER', 'EMPLOYEE'),
 *   getScheduleHandler
 * )
 */
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
