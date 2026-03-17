import { Router, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { requireAuth, AuthRequest } from '../middleware/auth'

const router = Router()

const AddEmployeeSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['MANAGER', 'EMPLOYEE']).default('EMPLOYEE'),
  password: z.string().min(8).default('changeme123'),
})

// GET /api/workspaces/:workspaceId/employees
router.get('/:workspaceId/employees', requireAuth, async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params

  // Verify caller is a member of this workspace
  const callerMembership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: req.user!.userId, workspaceId } },
  })
  if (!callerMembership) {
    res.status(403).json({ error: 'Not a member of this workspace' })
    return
  }

  const members = await prisma.membership.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true, email: true, createdAt: true } } },
    orderBy: { createdAt: 'asc' },
  })

  res.json(members.map(m => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    joinedAt: m.createdAt,
  })))
})

// POST /api/workspaces/:workspaceId/employees
router.post('/:workspaceId/employees', requireAuth, async (req: AuthRequest, res: Response) => {
  const { workspaceId } = req.params

  // Only managers/owners can add employees
  const callerMembership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: req.user!.userId, workspaceId } },
  })
  if (!callerMembership || callerMembership.role === 'EMPLOYEE') {
    res.status(403).json({ error: 'Only managers and owners can add employees' })
    return
  }

  const parsed = AddEmployeeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { email, name, role, password } = parsed.data

  // Check if user already exists
  let user = await prisma.user.findUnique({ where: { email } })

  if (user) {
    // Check if already a member
    const existingMembership = await prisma.membership.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
    })
    if (existingMembership) {
      res.status(409).json({ error: 'User is already a member of this workspace' })
      return
    }
  } else {
    // Create new user account
    const bcrypt = await import('bcryptjs')
    const passwordHash = await bcrypt.hash(password, 12)
    user = await prisma.user.create({ data: { email, name, passwordHash } })
  }

  const membership = await prisma.membership.create({
    data: { userId: user.id, workspaceId, role },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  res.status(201).json({
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
    joinedAt: membership.createdAt,
  })
})

// DELETE /api/workspaces/:workspaceId/employees/:userId
router.delete('/:workspaceId/employees/:userId', requireAuth, async (req: AuthRequest, res: Response) => {
  const { workspaceId, userId } = req.params

  const callerMembership = await prisma.membership.findUnique({
    where: { userId_workspaceId: { userId: req.user!.userId, workspaceId } },
  })
  if (!callerMembership || callerMembership.role === 'EMPLOYEE') {
    res.status(403).json({ error: 'Insufficient permissions' })
    return
  }

  await prisma.membership.delete({
    where: { userId_workspaceId: { userId, workspaceId } },
  })

  res.json({ ok: true })
})

export default router
