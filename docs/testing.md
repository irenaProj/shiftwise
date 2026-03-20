# Testing

## Strategy

Three-layer test approach — each layer tests what it's best at:

| Layer | Tool | What it tests | Speed |
|-------|------|---------------|-------|
| Backend API | Jest + Supertest | Routes, middleware, auth, RBAC | Fast — no browser |
| Frontend components | Vitest + Testing Library | React components in isolation | Fast — no browser |
| E2E | Playwright | Critical user journeys in a real browser | Slower |

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
const prismaMock = mockDeep<PrismaClient>()
jest.mock('../lib/prisma', () => ({ prisma: prismaMock }))
beforeEach(() => mockReset(prismaMock))
```

Each test controls exactly what Prisma returns:

```typescript
prismaMock.user.findUnique.mockResolvedValue(fakeUser)
prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
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

## Running in CI

The CI workflow runs Jest automatically on every push and PR — see
[Deployment](deployment.md) for the full CI setup.

Tests run after the build job succeeds, ensuring type errors are caught before
tests run.

### Failing tests in CI

If a test fails in CI:
1. Go to **GitHub repo → Actions tab**
2. Click the failing run
3. Expand the **Backend — Jest tests** job
4. Read the failure output directly in the logs

---

## Adding new tests

When adding a new route or feature, follow this pattern:

1. Add fake data to `helpers.ts` if needed
2. Create a new `describe` block in the relevant test file
3. Mock the Prisma calls the route will make
4. Assert the response status and body

```typescript
describe('POST /api/workspaces/:workspaceId/shifts', () => {
  it('allows a manager to create a shift', async () => {
    prismaMock.user.findUnique.mockResolvedValue(fakeUser)
    prismaMock.membership.findUnique.mockResolvedValue(fakeMembership)
    prismaMock.shift.create.mockResolvedValue(fakeShift)

    const res = await request(app)
      .post(`/api/workspaces/${fakeWorkspace.id}/shifts`)
      .set('Authorization', `Bearer ${managerToken()}`)
      .send({ ... })

    expect(res.status).toBe(201)
  })
})
```
