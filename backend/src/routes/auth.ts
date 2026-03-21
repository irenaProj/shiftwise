import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt";
import { Unauthorized, Conflict, BadRequest } from "../lib/errors";
import { Ok, Created } from "../lib/responses";
import { RegisterSchema, LoginSchema } from "../validation/auth";

const router = Router();

// POST /api/auth/register
router.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = RegisterSchema.safeParse(req.body);
      if (!parsed.success)
        return next(BadRequest(JSON.stringify(parsed.error.flatten())));

      const { email, password, name, workspaceName } = parsed.data;

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return next(Conflict("Email already in use"));

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          ...(workspaceName && {
            memberships: {
              create: {
                role: "OWNER",
                workspace: { create: { name: workspaceName } },
              },
            },
          }),
        },
      });

      const accessToken = signAccessToken({
        userId: user.id,
        email: user.email,
      });
      const refreshToken = signRefreshToken({
        userId: user.id,
        email: user.email,
      });

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      Created(res, {
        accessToken,
        user: { id: user.id, email: user.email, name: user.name },
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/login
router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success)
        return next(BadRequest(JSON.stringify(parsed.error.flatten())));

      const { email, password } = parsed.data;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return next(Unauthorized("Invalid credentials"));

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return next(Unauthorized("Invalid credentials"));

      const accessToken = signAccessToken({
        userId: user.id,
        email: user.email,
      });
      const refreshToken = signRefreshToken({
        userId: user.id,
        email: user.email,
      });

      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      const membership = await prisma.membership.findFirst({
        where: { userId: user.id },
        include: { workspace: true },
      });

      Ok(res, {
        accessToken,
        user: { id: user.id, email: user.email, name: user.name },
        workspace: membership
          ? {
              id: membership.workspaceId,
              name: membership.workspace.name,
              role: membership.role,
            }
          : null,
      });
    } catch (err) {
      next(err);
    }
  },
);

// POST /api/auth/refresh
router.post(
  "/refresh",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.refreshToken;
      if (!token) return next(Unauthorized("No refresh token"));

      const payload = verifyRefreshToken(token);

      const stored = await prisma.refreshToken.findUnique({ where: { token } });
      if (!stored || stored.expiresAt < new Date()) {
        return next(Unauthorized("Refresh token invalid or expired"));
      }

      await prisma.refreshToken.delete({ where: { token } });

      const newRefreshToken = signRefreshToken({
        userId: payload.userId,
        email: payload.email,
      });
      const newAccessToken = signAccessToken({
        userId: payload.userId,
        email: payload.email,
      });

      await prisma.refreshToken.create({
        data: {
          token: newRefreshToken,
          userId: payload.userId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      Ok(res, { accessToken: newAccessToken });
    } catch (err) {
      next(Unauthorized("Invalid refresh token"));
    }
  },
);

// POST /api/auth/logout
router.post(
  "/logout",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.cookies?.refreshToken;
      if (token) {
        await prisma.refreshToken.deleteMany({ where: { token } });
      }
      res.clearCookie("refreshToken");
      Ok(res, { ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
