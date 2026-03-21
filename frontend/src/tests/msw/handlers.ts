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
];
