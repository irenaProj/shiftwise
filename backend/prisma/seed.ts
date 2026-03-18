import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create workspace
  const workspace = await prisma.workspace.upsert({
    where: { id: "seed-workspace-1" },
    update: {},
    create: {
      id: "seed-workspace-1",
      name: "Demo Cafe",
      timezone: "Australia/Sydney",
    },
  });

  // Create manager
  const managerHash = await bcrypt.hash("password123", 12);
  const manager = await prisma.user.upsert({
    where: { email: "will.power@demo.com" },
    update: {},
    create: {
      email: "will.power@demo.com",
      passwordHash: managerHash,
      name: "Will Power",
      timezone: "Australia/Sydney",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_workspaceId: { userId: manager.id, workspaceId: workspace.id },
    },
    update: {},
    create: {
      userId: manager.id,
      workspaceId: workspace.id,
      role: Role.MANAGER,
    },
  });

  // Create employees
  const employees = [
    {
      email: "lou.poles@demo.com",
      name: "Lou Poles",
      timezone: "Australia/Sydney",
    },
    {
      email: "fran.tastic@demo.com",
      name: "Fran Tastic",
      timezone: "Australia/Sydney",
    },
    {
      email: "zack.lee@demo.com",
      name: "Zack Lee",
      timezone: "Australia/Sydney",
    },
  ];

  for (const emp of employees) {
    const hash = await bcrypt.hash("password123", 12);
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: {
        email: emp.email,
        passwordHash: hash,
        name: emp.name,
        timezone: emp.timezone,
      },
    });
    await prisma.membership.upsert({
      where: {
        userId_workspaceId: { userId: user.id, workspaceId: workspace.id },
      },
      update: {},
      create: {
        userId: user.id,
        workspaceId: workspace.id,
        role: Role.EMPLOYEE,
      },
    });
  }

  console.log("✅ Seed complete");
  console.log("   Workspace: Demo Cafe");
  console.log("   Manager:   will.power@demo.com / password123");
  console.log(
    "   Employees: lou.poles, fran.tastic, zack.lee @demo.com / password123",
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
