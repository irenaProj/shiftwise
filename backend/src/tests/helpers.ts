import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { signAccessToken } from '../lib/jwt'
import authRoutes from '../routes/auth'
import workspaceRoutes from '../routes/workspaces'
import { AppError } from '../lib/errors'

// Build a test instance of the Express app
export function buildApp() {
  const app = express()
  app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/auth', authRoutes)
  app.use('/api/workspaces', workspaceRoutes)
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message, code: err.code })
      return
    }
    res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' })
  })
  return app
}

// Fake users for tests
export const fakeUser = {
  id: 'user-1',
  email: 'will.power@demo.com',
  name: 'Will Power',
  passwordHash: '$2a$12$hi4Ja2V7WNhhb6HY4xBlbe4ROKBwDo/yGUUOoDS8dtcqiXCxbyeZu', // password123
  timezone: 'Australia/Sydney',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

export const fakeWorkspace = {
  id: 'workspace-1',
  name: 'Demo Cafe',
  timezone: 'Australia/Sydney',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

export const fakeMembership = {
  id: 'membership-1',
  userId: fakeUser.id,
  workspaceId: fakeWorkspace.id,
  role: 'MANAGER' as const,
  createdAt: new Date('2026-01-01'),
  workspace: fakeWorkspace,
}

export const fakeEmployee = {
  id: 'user-2',
  email: 'lou.poles@demo.com',
  name: 'Lou Poles',
  passwordHash: '$2a$12$hi4Ja2V7WNhhb6HY4xBlbe4ROKBwDo/yGUUOoDS8dtcqiXCxbyeZu',
  timezone: 'Australia/Sydney',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

export const fakeEmployeeMembership = {
  id: 'membership-2',
  userId: fakeEmployee.id,
  workspaceId: fakeWorkspace.id,
  role: 'EMPLOYEE' as const,
  createdAt: new Date('2026-01-01'),
  workspace: fakeWorkspace,
}

// Generate a valid access token for a user
export function tokenFor(userId: string, email: string) {
  return signAccessToken({ userId, email })
}

export function managerToken() {
  return tokenFor(fakeUser.id, fakeUser.email)
}

export function employeeToken() {
  return tokenFor(fakeEmployee.id, fakeEmployee.email)
}
