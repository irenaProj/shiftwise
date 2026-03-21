import { http, HttpResponse } from "msw";

const BASE = "http://localhost:3001";

export const fakeUser = {
  id: "user-1",
  email: "will.power@demo.com",
  name: "Will Power",
};

export const fakeWorkspace = {
  id: "workspace-1",
  name: "Demo Cafe",
  role: "MANAGER",
};

export const fakeSkills = [
  { id: 'skill-1', name: 'Barista' },
  { id: 'skill-2', name: 'Cashier' },
]

export const fakeShiftTemplates = [
  { id: 'template-1', name: 'Morning', startTime: '06:00', endTime: '14:00' },
  { id: 'template-2', name: 'Afternoon', startTime: '14:00', endTime: '22:00' },
]

export const fakeForecastSlots = [
  { id: 'slot-1', dayOfWeek: 1, time: '09:00', required: 3 },
  { id: 'slot-2', dayOfWeek: 1, time: '12:00', required: 2 },
]

export const fakeAvailability = [
  { id: 'avail-1', dayOfWeek: 1, startTime: '07:00', endTime: '15:00' },
  { id: 'avail-2', dayOfWeek: 2, startTime: '07:00', endTime: '15:00' },
]

export const fakeEmployees = [
  {
    id: "user-1",
    name: "Will Power",
    email: "will.power@demo.com",
    role: "MANAGER",
    timezone: "Australia/Sydney",
    joinedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "user-2",
    name: "Lou Poles",
    email: "lou.poles@demo.com",
    role: "EMPLOYEE",
    timezone: "Australia/Sydney",
    joinedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "user-3",
    name: "Fran Tastic",
    email: "fran.tastic@demo.com",
    role: "EMPLOYEE",
    timezone: "Australia/Sydney",
    joinedAt: "2026-01-01T00:00:00.000Z",
  },
];

export const handlers = [
  // Login — success
  http.post(`${BASE}/api/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.password === "wrongpassword" || body.email === "wrong@demo.com") {
      return HttpResponse.json(
        { error: "Invalid credentials", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }
    // Return workspace for all valid logins including post-registration
    return HttpResponse.json({
      accessToken: "fake-access-token",
      user: fakeUser,
      workspace: fakeWorkspace,
    });
  }),

  // Refresh token
  http.post(`${BASE}/api/auth/refresh`, () => {
    return HttpResponse.json({ accessToken: "fake-access-token" });
  }),

  // Register — success
  http.post(`${BASE}/api/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { email: string };
    if (body.email === "existing@demo.com") {
      return HttpResponse.json(
        { error: "Email already in use", code: "CONFLICT" },
        { status: 409 },
      );
    }
    return HttpResponse.json(
      { accessToken: "fake-access-token", user: fakeUser },
      { status: 201 },
    );
  }),

  // Login after register (called by RegisterPage)
  // handled by same login handler above

  // Logout
  http.post(`${BASE}/api/auth/logout`, () => {
    return HttpResponse.json({ ok: true });
  }),

  // List employees
  http.get(`${BASE}/api/workspaces/:workspaceId/employees`, () => {
    return HttpResponse.json(fakeEmployees);
  }),

  // Add employee — success
  http.post(
    `${BASE}/api/workspaces/:workspaceId/employees`,
    async ({ request }) => {
      const body = (await request.json()) as { email: string; name: string };
      if (body.email === "duplicate@demo.com") {
        return HttpResponse.json(
          {
            error: "User is already a member of this workspace",
            code: "CONFLICT",
          },
          { status: 409 },
        );
      }
      return HttpResponse.json(
        {
          id: "user-new",
          name: body.name,
          email: body.email,
          role: "EMPLOYEE",
          timezone: "Australia/Sydney",
          joinedAt: new Date().toISOString(),
        },
        { status: 201 },
      );
    },
  ),

  // Delete employee
  http.delete(`${BASE}/api/workspaces/:workspaceId/employees/:userId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Skills
  http.get(`${BASE}/api/workspaces/:workspaceId/skills`, () => {
    return HttpResponse.json(fakeSkills);
  }),
  http.post(`${BASE}/api/workspaces/:workspaceId/skills`, async ({ request }) => {
    const body = (await request.json()) as { name: string };
    return HttpResponse.json({ id: 'skill-new', name: body.name }, { status: 201 });
  }),
  http.delete(`${BASE}/api/workspaces/:workspaceId/skills/:skillId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Employee skills
  http.get(`${BASE}/api/workspaces/:workspaceId/employees/:userId/skills`, () => {
    return HttpResponse.json([fakeSkills[0]]);
  }),
  http.post(`${BASE}/api/workspaces/:workspaceId/employees/:userId/skills`, async ({ request }) => {
    const body = (await request.json()) as { skillId: string };
    const skill = fakeSkills.find(s => s.id === body.skillId) ?? { id: body.skillId, name: 'Unknown' };
    return HttpResponse.json(skill, { status: 201 });
  }),
  http.delete(`${BASE}/api/workspaces/:workspaceId/employees/:userId/skills/:skillId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Shift templates
  http.get(`${BASE}/api/workspaces/:workspaceId/shift-templates`, () => {
    return HttpResponse.json(fakeShiftTemplates);
  }),
  http.post(`${BASE}/api/workspaces/:workspaceId/shift-templates`, async ({ request }) => {
    const body = (await request.json()) as { name: string; startTime: string; endTime: string };
    return HttpResponse.json({ id: 'template-new', ...body }, { status: 201 });
  }),
  http.delete(`${BASE}/api/workspaces/:workspaceId/shift-templates/:templateId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Forecast
  http.get(`${BASE}/api/workspaces/:workspaceId/forecast`, () => {
    return HttpResponse.json(fakeForecastSlots);
  }),
  http.put(`${BASE}/api/workspaces/:workspaceId/forecast`, async ({ request }) => {
    const body = (await request.json()) as { dayOfWeek: number; time: string; required: number };
    return HttpResponse.json({ id: 'slot-new', ...body });
  }),
  http.delete(`${BASE}/api/workspaces/:workspaceId/forecast/:slotId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Availability
  http.get(`${BASE}/api/workspaces/:workspaceId/employees/:userId/availability`, () => {
    return HttpResponse.json(fakeAvailability);
  }),
  http.put(`${BASE}/api/workspaces/:workspaceId/employees/:userId/availability`, async ({ request }) => {
    const body = (await request.json()) as { dayOfWeek: number; startTime: string; endTime: string };
    return HttpResponse.json({ id: 'avail-new', ...body });
  }),
  http.delete(`${BASE}/api/workspaces/:workspaceId/employees/:userId/availability/:availabilityId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
