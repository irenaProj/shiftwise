import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: 'seed-workspace-1' },
    update: {},
    create: {
      id: 'seed-workspace-1',
      name: 'Demo Cafe',
    },
  })

  // Create manager
  const managerHash = await bcrypt.hash('password123', 12)
  const manager = await prisma.user.upsert({
    where: { email: 'manager@demo.com' },
    update: {},
    create: {
      email: 'manager@demo.com',
      passwordHash: managerHash,
      name: 'Alex Manager',
    },
  })

  await prisma.membership.upsert({
    where: { userId_workspaceId: { userId: manager.id, workspaceId: workspace.id } },
    update: {},
    create: { userId: manager.id, workspaceId: workspace.id, role: Role.MANAGER },
  })

  // Create employees
  const employees = [
    { email: 'alice@demo.com', name: 'Alice Chen' },
    { email: 'bob@demo.com', name: 'Bob Santos' },
    { email: 'carol@demo.com', name: 'Carol White' },
  ]

  for (const emp of employees) {
    const hash = await bcrypt.hash('password123', 12)
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: { email: emp.email, passwordHash: hash, name: emp.name },
    })
    await prisma.membership.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
      update: {},
      create: { userId: user.id, workspaceId: workspace.id, role: Role.EMPLOYEE },
    })
  }

  console.log('✅ Seed complete')
  console.log('   Workspace: Demo Cafe')
  console.log('   Manager:   manager@demo.com / password123')
  console.log('   Employees: alice, bob, carol @demo.com / password123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
