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

Override handlers per-test to simulate errors:

```typescript
server.use(
  http.post("http://localhost:3001/api/auth/login", () => {
    return HttpResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }),
);
```

### Key patterns

**Rendering with providers:**

```typescript
// Wraps component with QueryClient + MemoryRouter
renderWithProviders(<LoginPage />)
```

**Setting auth state:**

```typescript
// Populate Zustand store before rendering
setAuthenticatedUser("MANAGER");
```

**User interactions:**

```typescript
const user = userEvent.setup();
await user.type(
  screen.getByPlaceholderText("you@company.com"),
  "test@demo.com",
);
await user.click(screen.getByRole("button", { name: /sign in/i }));
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

**Store (`store.test.ts`):**

- Initial state is null
- `setAuth` stores all values
- `setAccessToken` updates token only
- `clear` resets everything
- Accepts null workspace

**ProtectedRoute (`ProtectedRoute.test.tsx`):**

- Redirects unauthenticated users to `/login`
- Renders children for authenticated users
- Redirects when workspace is null

**LoginPage (`LoginPage.test.tsx`):**

- Renders form correctly
- Shows demo credentials
- Navigates to dashboard on success
- Shows error on invalid credentials
- Shows loading state while submitting
- Shows generic error when no message returned
- Has link to register page

**RegisterPage (`RegisterPage.test.tsx`):**

- Renders form correctly
- Navigates to dashboard on success
- Shows error when email already in use
- Has link to login page
- Shows loading state while submitting

**DashboardPage (`DashboardPage.test.tsx`):**

- Renders workspace name and user name
- Loads and displays employees
- Shows correct stats strip counts
- Shows Add member button for managers
- Hides Add member button for employees
- Opens modal when Add member clicked
- Shows delete buttons for other employees
- Does not show delete button for self
- Clears auth on logout

**AddEmployeeModal (`AddEmployeeModal.test.tsx`):**

- Renders form fields
- Calls onClose when cancel clicked
- Calls onClose when X clicked
- Submits form and closes on success
- Shows error for duplicate employee
- Shows loading state while submitting

---

## E2E tests (Playwright)

### Setup

Tests live at the root level alongside `backend/` and `frontend/`:

```
e2e/
├── global-setup.ts      # Resets and reseeds test DB before every run
├── seed.ts              # Wipes and reseeds known test data
├── fixtures/
│   └── auth.ts          # Pre-authenticated page fixture + login helper
└── tests/
    ├── auth.spec.ts     # Login, logout, redirect, invalid credentials
    └── employees.spec.ts # List, add, conflict, cancel
```

### Test database (Neon branch)

E2E tests run against a dedicated **Neon testing branch** — completely isolated
from production data. Before every test run, `global-setup.ts` wipes all data
and reseeds a known clean state:

```
Manager:   will.power@demo.com / password123
Employees: lou.poles, fran.tastic, zack.lee @demo.com / password123
Workspace: Demo Cafe (Australia/Sydney)
```

This means tests always start from a predictable state regardless of what
previous test runs added or deleted.

### Running tests

```bash
# Run all E2E tests (resets DB first, starts dev server automatically)
npm run e2e

# Show Playwright report after a run
npm run e2e:report
```

> **Note:** `npm run dev` does not need to be running — Playwright starts the
> dev server automatically when `E2E_DATABASE_URL` is set and `CI` is not set.

> **Codespaces:** Make sure `npm run dev` is running in another terminal before
> running `npm run e2e` in Codespaces, as the auto-start may not work reliably.

### Required environment variables

| Variable           | Where       | Description                           |
| ------------------ | ----------- | ------------------------------------- |
| `E2E_DATABASE_URL` | Root `.env` | Neon testing branch connection string |
| `E2E_BASE_URL`     | CI only     | Production URL to run E2E against     |

### What's covered

**Auth (`auth.spec.ts`):**

- Login page renders correctly
- Shows demo credentials
- Successful login navigates to dashboard
- ~~Invalid credentials shows error~~ _(skipped — axios interceptor conflict, see known issues)_
- Unauthenticated user redirected to login
- Logout redirects to login

**Employees (`employees.spec.ts`):**

- Dashboard shows employee list
- Shows stats strip with correct counts
- Manager can open Add member modal
- Manager can add a new employee
- Shows conflict error for duplicate email
- Cancel button closes modal

### Known issues

**Invalid credentials test skipped:** The axios refresh interceptor catches
401 responses and redirects to `/login` before the error state can render in
the browser. This affects the E2E test only — the Vitest unit test covers this
scenario correctly. Fix: update the interceptor in `src/lib/api.ts` to not
trigger on auth route failures (`/api/auth/login`, `/api/auth/register`).

### Artifacts on failure

When a test fails in CI, Playwright captures:

- **Screenshot** — what the browser showed at the point of failure
- **Video** — full recording of the test run
- **Trace** — step-by-step execution log

These are uploaded as a GitHub Actions artifact called `playwright-report`
and available for 7 days after the run.

---

## Running in CI

The full CI pipeline runs on every push and PR:

```
backend build → backend tests (Jest)
frontend build → frontend tests (Vitest)
                              ↓
                         E2E tests (Playwright, against production)
```

### CI jobs

| Job                           | Trigger               | What runs                         |
| ----------------------------- | --------------------- | --------------------------------- |
| Backend — type check & build  | Every push/PR         | `tsc`                             |
| Backend — Jest tests          | After build passes    | 18 Jest tests                     |
| Frontend — type check & build | Every push/PR         | `vite build`                      |
| Frontend — Vitest tests       | After build passes    | 36 Vitest tests                   |
| E2E — Playwright              | After unit tests pass | 11 Playwright tests vs production |

### Failing tests in CI

**Jest failure:**

1. GitHub repo → **Actions** tab → failing run
2. Expand **Backend — Jest tests** job
3. Read failure output in logs

**Vitest failure:**

1. GitHub repo → **Actions** tab → failing run
2. Expand **Frontend — Vitest tests** job

**Playwright failure:**

1. GitHub repo → **Actions** tab → failing run
2. Expand **E2E — Playwright** job
3. Download **playwright-report** artifact for screenshots and traces

---

## Adding new tests

### Adding a backend test

1. Add fake data to `helpers.ts` if needed
2. Create a new `describe` block in the relevant test file
3. Mock the Prisma calls the route will make
4. Assert the response status and body

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

### Adding a frontend test

1. Add MSW handlers to `handlers.ts` for any new API endpoints
2. Create a new test file in the appropriate folder
3. Use `renderWithProviders` and `setAuthenticatedUser` as needed

```typescript
it('renders the shift calendar', async () => {
  setAuthenticatedUser('MANAGER')
  renderWithProviders(<SchedulePage />)
  await waitFor(() => {
    expect(screen.getByText('Week of')).toBeInTheDocument()
  })
})
```

### Adding an E2E test

1. Add the scenario to `e2e/seed.ts` if new test data is needed
2. Create a new spec file or add to an existing one
3. Use the `authenticatedPage` fixture for tests that require login

```typescript
test("manager can generate a schedule", async ({ authenticatedPage: page }) => {
  await page.getByRole("button", { name: /generate schedule/i }).click();
  await expect(page.getByText("Schedule generated")).toBeVisible();
});
```
