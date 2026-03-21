# Testing

## Strategy

Three-layer test approach — each layer tests what it's best at:

| Layer               | Tool                     | What it tests                            | Speed             |
| ------------------- | ------------------------ | ---------------------------------------- | ----------------- |
| Backend API         | Jest + Supertest         | Routes, middleware, auth, RBAC           | Fast — no browser |
| Frontend components | Vitest + Testing Library | React components in isolation            | Fast — no browser |
| E2E                 | Playwright               | Critical user journeys in a real browser | Slower            |

---

## Backend tests (Jest + Supertest)

### Setup

Tests live in `backend/src/tests/` organised by feature:

```
backend/src/tests/
├── setup.ts              # Prisma mock + global beforeEach reset
├── helpers.ts            # Shared fakes, app builder, token generators
├── auth/
│   └── auth.test.ts      # Register, login, logout, invalid credentials
└── workspaces/
    └── workspaces.test.ts # List, add, delete employees + RBAC checks
```

### Prisma mocking

Tests use `jest-mock-extended` to create a fully typed deep mock of the Prisma
client. The real database is never hit — tests are fast and run in CI without
any external dependencies.

```typescript
// setup.ts — mock is reset before every test
const prismaMock = mockDeep<PrismaClient>();
jest.mock("../lib/prisma", () => ({ prisma: prismaMock }));
beforeEach(() => mockReset(prismaMock));
```

Each test controls exactly what Prisma returns:

```typescript
prismaMock.user.findUnique.mockResolvedValue(fakeUser);
prismaMock.membership.findUnique.mockResolvedValue(fakeMembership);
```

### Running tests

```bash
# Run all tests
cd backend && npm test

# Watch mode
cd backend && npm run test:watch

# With coverage
cd backend && npm run test:coverage
```

### What's covered

**Auth (`auth.test.ts`):**

- Login with valid credentials → 200 + tokens
- Login with invalid password → 401
- Login with unknown email → 401
- Login with invalid email format → 400
- Register new user → 201 + tokens
- Register with existing email → 409
- Register with short password → 400
- Logout → 200 + cookie cleared

**Workspaces (`workspaces.test.ts`):**

- Manager lists employees → 200 + list
- Request without token → 401
- Request from non-member → 403
- Manager adds new employee → 201
- Manager adds existing member → 409
- Employee tries to add member → 403
- Manager deletes employee → 204
- Manager tries to delete themselves → 400
- Employee tries to delete → 403

---

## Frontend tests (Vitest + Testing Library)

### Setup

Tests live in `frontend/src/tests/` organised by type:

```
frontend/src/tests/
├── setup.ts                    # MSW server + @testing-library/jest-dom
├── utils.tsx                   # renderWithProviders, setAuthenticatedUser, clearAuth
├── msw/
│   └── handlers.ts             # MSW request handlers — intercepts real HTTP
├── store/
│   └── store.test.ts           # Zustand auth store
├── components/
│   ├── ProtectedRoute.test.tsx
│   └── AddEmployeeModal.test.tsx
└── pages/
    ├── LoginPage.test.tsx
    ├── RegisterPage.test.tsx
    └── DashboardPage.test.tsx
```

### MSW (Mock Service Worker)

Tests use MSW to intercept real HTTP requests at the network level — more
realistic than mocking axios directly. The MSW server starts before all tests
and resets handlers after each test so state never leaks.

```typescript
// setup.ts
export const server = setupServer(...handlers);
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

The axios instance base URL is set to `http://localhost:3001/api` in the test
setup so MSW can intercept requests correctly (jsdom has no base URL):

```typescript
// setup.ts
import { api } from "../lib/api";
api.defaults.baseURL = "http://localhost:3001/api";
```

Override handlers per-test to simulate errors:

```typescript
server.use(
  http.post("http://localhost:3001/api/auth/login", () => {
    return HttpResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }),
);
```

### Running tests

```bash
# Run all tests
cd frontend && npm test

# Watch mode
cd frontend && npm run test:watch

# With coverage
cd frontend && npm run test:coverage
```

### What's covered

36 tests covering: store state management, protected route redirects, login/register
form submission and error states, dashboard employee list, add/delete employee,
modal open/close, loading states, and RBAC visibility.

---

## E2E tests (Playwright)

### Setup

Tests live at the root level alongside `backend/` and `frontend/`:

```
e2e/
├── global-setup.ts      # Resets test DB locally (skipped in CI)
├── seed.ts              # Wipes all data and reseeds known test state
├── fixtures/
│   └── auth.ts          # Pre-authenticated page fixture + login helper
└── tests/
    ├── auth.spec.ts     # Login, logout, redirect, invalid credentials
    └── employees.spec.ts # List, add, conflict, cancel
```

### Test database (Neon testing branch)

E2E tests run against a dedicated **Neon testing branch** — completely isolated
from production data. The test DB is reset and reseeded with known data before
every run:

```
Manager:   will.power@demo.com / password123
Employees: lou.poles, fran.tastic, zack.lee @demo.com / password123
Workspace: Demo Cafe (Australia/Sydney)
```

### How the test DB is reset

**Locally:** `global-setup.ts` runs automatically before Playwright starts and
calls `e2e/seed.ts` against `E2E_DATABASE_URL`.

**In CI:** The workflow resets the DB as a dedicated step before starting servers.
`global-setup.ts` detects `CI=true` and skips to avoid double-reset.

### Required environment variables

| Variable           | Where                       | Description                           |
| ------------------ | --------------------------- | ------------------------------------- |
| `E2E_DATABASE_URL` | Root `.env` + GitHub secret | Neon testing branch connection string |

> **Important:** `E2E_DATABASE_URL` must be added as both a local root `.env`
> variable AND a GitHub repository secret. Missing the GitHub secret causes the
> CI backend to start with an empty `DATABASE_URL` — all login attempts fail silently.

### Running tests locally

```bash
# Ensure E2E_DATABASE_URL is set in root .env
npm run e2e

# Show report after a run
npm run e2e:report
```

> **Codespaces:** Run `npm run dev` in one terminal first, then `npm run e2e`
> in another.

### What's covered

**Auth (`auth.spec.ts`):**

- Login page renders correctly ✅
- Shows demo credentials ✅
- Successful login navigates to dashboard ✅
- ~~Invalid credentials shows error~~ _(skipped — see known issues)_
- Unauthenticated user redirected to login ✅
- Logout redirects to login ✅

**Employees (`employees.spec.ts`):**

- Dashboard shows employee list ✅
- Shows stats strip with correct counts ✅
- Manager can open Add member modal ✅
- Manager can add a new employee ✅
- Shows conflict error for duplicate email ✅
- Cancel button closes modal ✅

### Known issues

**Invalid credentials test skipped:** The axios refresh interceptor catches all
401 responses and redirects to `/login` before the error state can render in
the browser. The Vitest unit test covers this scenario correctly.

**Fix:** Update `src/lib/api.ts` to not trigger the refresh interceptor on
`/api/auth/login` and `/api/auth/register` failures.

---

## CI pipeline

```
backend build ──────────────────► backend tests (Jest)   ──┐
                                                             ├──► E2E (Playwright)
frontend build ─────────────────► frontend tests (Vitest) ─┘
```

### Jobs

| Job                           | Trigger               | What runs                     |
| ----------------------------- | --------------------- | ----------------------------- |
| Backend — type check & build  | Every push/PR         | `tsc`                         |
| Backend — Jest tests          | After build           | 18 Jest tests (mocked Prisma) |
| Frontend — type check & build | Every push/PR         | `vite build`                  |
| Frontend — Vitest tests       | After build           | 36 Vitest tests (MSW)         |
| E2E — Playwright              | After unit tests pass | 11 Playwright tests           |

### How E2E runs in CI (isolated test backend)

The E2E job spins up a fully isolated environment — no production data involved:

1. Builds backend (`tsc`)
2. Builds frontend with `VITE_API_URL=http://localhost:3001`
3. Resets and reseeds the Neon test branch via `e2e/seed.ts`
4. Starts backend on port 3001 connected to test branch (`E2E_DATABASE_URL`)
5. Serves frontend via `vite preview` on port 4173
6. Waits for both servers ready
7. Runs Playwright against `http://localhost:4173`

### Playwright failure artifacts

When a test fails in CI, these are uploaded as the `playwright-report` artifact
(retained 7 days):

- **Screenshot** — browser state at point of failure
- **Video** — full test run recording
- **Trace** — step-by-step log, view with `npx playwright show-trace trace.zip`

### Coverage reports

Coverage is uploaded to Codecov after every CI run by both the backend and
frontend test jobs. View the full report at:

https://codecov.io/gh/irenaProj/shiftwise

The README badge reflects the combined coverage across both packages. Codecov
also shows a breakdown by `backend` and `frontend` flags separately.

To run coverage locally:
```bash
# Backend
cd backend && npm run test:coverage

# Frontend
cd frontend && npm run test:coverage
```

HTML reports are written to `backend/coverage/` and `frontend/coverage/`
respectively — open `index.html` in a browser to browse line-by-line coverage.

---

## Adding new tests

### Backend

```typescript
describe("POST /api/workspaces/:workspaceId/shifts", () => {
  it("allows a manager to create a shift", async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser);
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership);
    prismaMock.shift.create.mockResolvedValue(fakeShift);

    const res = await request(app)
      .post(`/api/workspaces/${fakeWorkspace.id}/shifts`)
      .set("Authorization", `Bearer ${managerToken()}`)
      .send({ startTime: "09:00", endTime: "17:00" });

    expect(res.status).toBe(201);
  });
});
```

### Frontend

```typescript
it('renders the shift calendar', async () => {
  setAuthenticatedUser('MANAGER')
  renderWithProviders(<SchedulePage />)
  await waitFor(() => {
    expect(screen.getByText('Week of')).toBeInTheDocument()
  })
})
```

### E2E

Add data to `e2e/seed.ts` if the test needs specific state, then add a spec:

```typescript
test("manager can generate a schedule", async ({ authenticatedPage: page }) => {
  await page.getByRole("button", { name: /generate schedule/i }).click();
  await expect(page.getByText("Schedule generated")).toBeVisible();
});
```
