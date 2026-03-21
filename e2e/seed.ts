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
  // Delete in dependency order (leaves → roots)
  await prisma.refreshToken.deleteMany()
  await prisma.availability.deleteMany()
  await prisma.membershipSkill.deleteMany()
  await prisma.membership.deleteMany()
  await prisma.forecastSlot.deleteMany()
  await prisma.shiftTemplate.deleteMany()
  await prisma.skill.deleteMany()
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

  const employeeMemberships: { id: string; userId: string }[] = []

  for (const emp of employees) {
    const hash = await bcrypt.hash('password123', 12)
    const user = await prisma.user.create({
      data: { ...emp, passwordHash: hash },
    })
    const membership = await prisma.membership.create({
      data: { userId: user.id, workspaceId: workspace.id, role: Role.EMPLOYEE },
    })
    employeeMemberships.push({ id: membership.id, userId: user.id })
  }

  // ─── Skills ────────────────────────────────────────────────
  const barista = await prisma.skill.create({
    data: { id: 'e2e-skill-1', name: 'Barista', workspaceId: workspace.id },
  })
  const cashier = await prisma.skill.create({
    data: { id: 'e2e-skill-2', name: 'Cashier', workspaceId: workspace.id },
  })

  // Assign Barista to Lou (first employee membership)
  await prisma.membershipSkill.create({
    data: { membershipId: employeeMemberships[0].id, skillId: barista.id },
  })

  // ─── Shift templates ───────────────────────────────────────
  await prisma.shiftTemplate.create({
    data: {
      id: 'e2e-template-1',
      name: 'Morning',
      startTime: '06:00',
      endTime: '14:00',
      workspaceId: workspace.id,
    },
  })
  await prisma.shiftTemplate.create({
    data: {
      id: 'e2e-template-2',
      name: 'Afternoon',
      startTime: '14:00',
      endTime: '22:00',
      workspaceId: workspace.id,
    },
  })

  // ─── Forecast slots ────────────────────────────────────────
  await prisma.forecastSlot.create({
    data: { id: 'e2e-slot-1', workspaceId: workspace.id, dayOfWeek: 1, time: '09:00', required: 3 },
  })
  await prisma.forecastSlot.create({
    data: { id: 'e2e-slot-2', workspaceId: workspace.id, dayOfWeek: 1, time: '12:00', required: 2 },
  })

  // ─── Availability ──────────────────────────────────────────
  await prisma.availability.create({
    data: {
      membershipId: employeeMemberships[0].id,
      dayOfWeek: 1,
      startTime: '07:00',
      endTime: '15:00',
    },
  })

  console.log('🌱 Test database seeded')
  console.log('   Workspace:  Demo Cafe')
  console.log('   Manager:    will.power@demo.com / password123')
  console.log('   Employees:  lou.poles, fran.tastic, zack.lee @demo.com / password123')
  console.log('   Skills:     Barista, Cashier')
  console.log('   Templates:  Morning, Afternoon')
  console.log('   Forecast:   Mon 09:00 (×3), Mon 12:00 (×2)')
  console.log('   Availability: Lou — Mon 07:00–15:00')
}

async function main() {
  console.log('🔄 Resetting E2E database...')
  await reset()
  await seed()
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
