/**
 * E2E database reset and seed script.
 * Runs against the Neon testing branch before Playwright tests.
 * Wipes all data and seeds a known clean state.
 */

import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient({
  datasourceUrl: process.env.E2E_DATABASE_URL,
})

async function reset() {
  // Delete in dependency order
  await prisma.refreshToken.deleteMany()
  await prisma.membership.deleteMany()
  await prisma.workspace.deleteMany()
  await prisma.user.deleteMany()
  console.log('🗑️  Database wiped')
}

async function seed() {
  const workspace = await prisma.workspace.create({
    data: {
      id: 'e2e-workspace-1',
      name: 'Demo Cafe',
      timezone: 'Australia/Sydney',
    },
  })

  const managerHash = await bcrypt.hash('password123', 12)
  const manager = await prisma.user.create({
    data: {
      id: 'e2e-user-manager',
      email: 'will.power@demo.com',
      passwordHash: managerHash,
      name: 'Will Power',
      timezone: 'Australia/Sydney',
    },
  })

  await prisma.membership.create({
    data: {
      userId: manager.id,
      workspaceId: workspace.id,
      role: Role.MANAGER,
    },
  })

  const employees = [
    { id: 'e2e-user-1', email: 'lou.poles@demo.com',   name: 'Lou Poles',   timezone: 'Australia/Sydney' },
    { id: 'e2e-user-2', email: 'fran.tastic@demo.com', name: 'Fran Tastic', timezone: 'Australia/Sydney' },
    { id: 'e2e-user-3', email: 'zack.lee@demo.com',    name: 'Zack Lee',    timezone: 'Australia/Sydney' },
  ]

  for (const emp of employees) {
    const hash = await bcrypt.hash('password123', 12)
    const user = await prisma.user.create({
      data: { ...emp, passwordHash: hash },
    })
    await prisma.membership.create({
      data: { userId: user.id, workspaceId: workspace.id, role: Role.EMPLOYEE },
    })
  }

  console.log('🌱 Test database seeded')
  console.log('   Workspace: Demo Cafe')
  console.log('   Manager:   will.power@demo.com / password123')
  console.log('   Employees: lou.poles, fran.tastic, zack.lee @demo.com / password123')
}

async function main() {
  console.log('🔄 Resetting E2E database...')
  await reset()
  await seed()
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
