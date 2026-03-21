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
  const employeeData = [
    { email: "lou.poles@demo.com", name: "Lou Poles", timezone: "Australia/Sydney" },
    { email: "fran.tastic@demo.com", name: "Fran Tastic", timezone: "Australia/Sydney" },
    { email: "zack.lee@demo.com", name: "Zack Lee", timezone: "Australia/Sydney" },
  ];

  const memberships: { userId: string; membershipId: string; name: string }[] = [];

  for (const emp of employeeData) {
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
    const membership = await prisma.membership.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
      update: {},
      create: { userId: user.id, workspaceId: workspace.id, role: Role.EMPLOYEE },
    });
    memberships.push({ userId: user.id, membershipId: membership.id, name: emp.name });
  }

  const [lou, fran, zack] = memberships;

  // ─── Skills ────────────────────────────────────────────────
  const skillNames = ["Barista", "Cashier", "Kitchen Hand"];
  const skills: { id: string; name: string }[] = [];

  for (const name of skillNames) {
    const skill = await prisma.skill.upsert({
      where: { name_workspaceId: { name, workspaceId: workspace.id } },
      update: {},
      create: { name, workspaceId: workspace.id },
    });
    skills.push({ id: skill.id, name: skill.name });
  }

  const [barista, cashier, kitchenHand] = skills;

  // Assign skills to employees
  const skillAssignments = [
    { membershipId: lou.membershipId, skillId: barista.id },
    { membershipId: lou.membershipId, skillId: cashier.id },
    { membershipId: fran.membershipId, skillId: barista.id },
    { membershipId: fran.membershipId, skillId: kitchenHand.id },
    { membershipId: zack.membershipId, skillId: cashier.id },
    { membershipId: zack.membershipId, skillId: kitchenHand.id },
  ];

  for (const assignment of skillAssignments) {
    await prisma.membershipSkill.upsert({
      where: {
        membershipId_skillId: {
          membershipId: assignment.membershipId,
          skillId: assignment.skillId,
        },
      },
      update: {},
      create: assignment,
    });
  }

  // ─── Shift templates ───────────────────────────────────────
  const templateData = [
    { name: "Morning", startTime: "06:00", endTime: "14:00" },
    { name: "Afternoon", startTime: "14:00", endTime: "22:00" },
    { name: "Split", startTime: "09:00", endTime: "13:00" },
  ];

  for (const t of templateData) {
    await prisma.shiftTemplate.upsert({
      where: {
        id: `seed-template-${t.name.toLowerCase()}`,
      },
      update: {},
      create: {
        id: `seed-template-${t.name.toLowerCase()}`,
        name: t.name,
        startTime: t.startTime,
        endTime: t.endTime,
        workspaceId: workspace.id,
      },
    });
  }

  // ─── Forecast slots ────────────────────────────────────────
  // Mon–Fri: morning peak (3 staff), afternoon (2 staff)
  // Sat–Sun: all-day peak (4 staff)
  const forecastData: { dayOfWeek: number; time: string; required: number }[] = [];

  const weekdayTimes = [
    { time: "08:00", required: 2 },
    { time: "08:30", required: 3 },
    { time: "09:00", required: 3 },
    { time: "09:30", required: 3 },
    { time: "10:00", required: 2 },
    { time: "12:00", required: 3 },
    { time: "12:30", required: 3 },
    { time: "13:00", required: 2 },
    { time: "17:00", required: 2 },
    { time: "17:30", required: 2 },
  ];

  const weekendTimes = [
    { time: "09:00", required: 4 },
    { time: "09:30", required: 4 },
    { time: "10:00", required: 4 },
    { time: "10:30", required: 3 },
    { time: "11:00", required: 3 },
    { time: "12:00", required: 4 },
    { time: "12:30", required: 4 },
    { time: "13:00", required: 3 },
  ];

  for (const day of [1, 2, 3, 4, 5]) { // Mon–Fri
    for (const slot of weekdayTimes) {
      forecastData.push({ dayOfWeek: day, ...slot });
    }
  }
  for (const day of [0, 6]) { // Sun, Sat
    for (const slot of weekendTimes) {
      forecastData.push({ dayOfWeek: day, ...slot });
    }
  }

  for (const slot of forecastData) {
    await prisma.forecastSlot.upsert({
      where: {
        workspaceId_dayOfWeek_time: {
          workspaceId: workspace.id,
          dayOfWeek: slot.dayOfWeek,
          time: slot.time,
        },
      },
      update: { required: slot.required },
      create: { workspaceId: workspace.id, ...slot },
    });
  }

  // ─── Availability ──────────────────────────────────────────
  // Lou: Mon–Fri 07:00–15:00
  // Fran: Tue–Sat 11:00–20:00
  // Zack: Wed–Sun 12:00–22:00
  const availabilityData = [
    ...([1, 2, 3, 4, 5].map((day) => ({
      membershipId: lou.membershipId,
      dayOfWeek: day,
      startTime: "07:00",
      endTime: "15:00",
    }))),
    ...([2, 3, 4, 5, 6].map((day) => ({
      membershipId: fran.membershipId,
      dayOfWeek: day,
      startTime: "11:00",
      endTime: "20:00",
    }))),
    ...([3, 4, 5, 6, 0].map((day) => ({
      membershipId: zack.membershipId,
      dayOfWeek: day,
      startTime: "12:00",
      endTime: "22:00",
    }))),
  ];

  for (const a of availabilityData) {
    await prisma.availability.upsert({
      where: {
        membershipId_dayOfWeek_startTime: {
          membershipId: a.membershipId,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
        },
      },
      update: {},
      create: a,
    });
  }

  console.log("✅ Seed complete");
  console.log("   Workspace:  Demo Cafe");
  console.log("   Manager:    will.power@demo.com / password123");
  console.log("   Employees:  lou.poles, fran.tastic, zack.lee @demo.com / password123");
  console.log("   Skills:     Barista, Cashier, Kitchen Hand");
  console.log("   Templates:  Morning (06–14), Afternoon (14–22), Split (09–13)");
  console.log("   Forecast:   50 slots across Mon–Sun");
  console.log("   Availability: Lou (Mon–Fri), Fran (Tue–Sat), Zack (Wed–Sun)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
