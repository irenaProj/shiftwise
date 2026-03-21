# Architecture

## Monorepo structure

```
shiftwise/
├── backend/           # Express API
├── frontend/          # React app
├── packages/
│   └── dates/         # Shared date utility package (@shiftwise/dates)
└── package.json       # npm workspaces root
```

npm workspaces links all three packages together. Dependencies are hoisted
to the root `node_modules` — no duplication, no symlink issues.

---

## Data model

The core schema is built around multi-tenant workspaces — a single deployment
serves multiple organisations with full data isolation.

```
users           → id, email, password_hash, name, timezone
workspaces      → id, name, timezone
memberships     → user_id, workspace_id, role (OWNER|MANAGER|EMPLOYEE)
refresh_tokens  → id, token, user_id, expires_at

skills          → id, workspace_id, name  [unique: (workspace_id, name)]
membership_skills → membership_id, skill_id  (join table)

shift_templates → id, workspace_id, name, start_time, end_time

forecast_slots  → id, workspace_id, day_of_week, time, required
                  [unique: (workspace_id, day_of_week, time)]

availability    → id, membership_id, day_of_week, start_time, end_time
                  [unique: (membership_id, day_of_week, start_time)]
```

Key design decisions:

- The `memberships` table with a composite unique key on `(userId, workspaceId)`
  enables multi-tenancy without duplicating user records. A user can belong to
  multiple workspaces with different roles in each.
- `timezone` is stored on both `users` and `workspaces`. User timezone takes
  priority — this handles managers in one city scheduling staff in another.
- `refresh_tokens` are stored in the database so they can be explicitly revoked
  on logout and rotated on each use.
- `skills` are workspace-scoped and linked to employees via the `membership_skills`
  join table — skills don't follow employees between workspaces.
- `forecast_slots` and `availability` both use composite unique keys to enable
  natural upsert semantics via `PUT` endpoints — the client doesn't need to know
  the record ID to update an existing slot.

---

## Request lifecycle

```
Incoming request
  │
  ├── cors()           — check Origin header against FRONTEND_URL
  ├── express.json()   — parse request body
  ├── cookieParser()   — parse httpOnly cookies
  ├── requestLogger()  — log method, path, status, duration
  │
  ├── requireAuth()    — verify Bearer token → attach full User to req.user
  ├── requireRole()    — verify workspace membership → attach Membership to req.membership
  │
  ├── Route handler    — business logic, Prisma queries, response
  │
  └── Global error handler
        ├── AppError   → { error, code } with correct HTTP status
        └── Unknown    → { error: message, code: INTERNAL_ERROR, stack? (dev only) }
```

---

## Authentication flow

```
Register / Login
  → signAccessToken()  → 15min JWT → returned in response body
  → signRefreshToken() → 7day JWT  → set as httpOnly, Secure, SameSite=Strict cookie

Every API request
  → Authorization: Bearer <accessToken>
  → requireAuth() verifies token → attaches User to req.user

Access token expires (15min)
  → Axios interceptor catches 401
  → POST /api/auth/refresh (cookie sent automatically by browser)
  → verifyRefreshToken() validates cookie
  → Old token deleted, new tokens issued (rotation)
  → Original request retried with new access token

Logout
  → Refresh token deleted from DB
  → Cookie cleared
  → Zustand state cleared → redirect to /login
```

---

## RBAC (Role-Based Access Control)

Two-layer system on every protected request:

| Layer | Middleware | Checks |
|-------|-----------|--------|
| Authentication | `requireAuth` | Valid Bearer token, user exists |
| Authorization | `requireRole(...roles)` | User is a workspace member with required role |

```typescript
// Clean one-liner on every route
router.delete('/:workspaceId/employees/:userId',
  requireAuth,
  requireRole('OWNER', 'MANAGER'),
  handler
)
```

`requireRole` attaches the full `Membership + Workspace` to `req.membership`
so route handlers never need an extra DB read to get workspace details.

---

## Error handling

A custom `AppError` class with convenience factories replaces scattered
`res.status().json()` calls:

```typescript
// Instead of:
res.status(403).json({ error: 'Insufficient permissions' })

// We throw:
throw Forbidden('Insufficient permissions')
```

All errors are caught by the global error handler which returns consistent
`{ error, code }` JSON. Unknown errors propagate the message always, but
only include the stack trace in development.

| Factory | Status | Code |
|---------|--------|------|
| `BadRequest()` | 400 | BAD_REQUEST |
| `Unauthorized()` | 401 | UNAUTHORIZED |
| `Forbidden()` | 403 | FORBIDDEN |
| `NotFound()` | 404 | NOT_FOUND |
| `Conflict()` | 409 | CONFLICT |
| `Internal()` | 500 | INTERNAL_ERROR |

---

## Project structure (full)

```
shiftwise/
├── packages/
│   └── dates/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── types.ts       # Shared types
│           ├── utc.ts         # UTC operations (BE + FE)
│           ├── display.ts     # Localisation (FE only)
│           └── index.ts       # Public facade
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # DB schema
│   │   └── seed.ts            # Demo data
│   ├── src/
│   │   ├── lib/
│   │   │   ├── prisma.ts      # Prisma singleton
│   │   │   ├── jwt.ts         # Token signing/verification
│   │   │   ├── errors.ts      # AppError class + convenience factories
│   │   │   └── responses.ts   # Ok, Created, NoContent helpers
│   │   ├── middleware/
│   │   │   ├── auth.ts        # requireAuth + requireRole middleware
│   │   │   └── logger.ts      # Request logger with method, status, duration
│   │   ├── validation/
│   │   │   ├── auth.ts        # RegisterSchema, LoginSchema
│   │   │   ├── workspaces.ts  # AddEmployeeSchema
│   │   │   ├── skills.ts      # CreateSkillSchema
│   │   │   ├── employeeSkills.ts # AddEmployeeSkillSchema
│   │   │   ├── shiftTemplates.ts # CreateShiftTemplateSchema
│   │   │   ├── forecast.ts    # UpsertForecastSlotSchema
│   │   │   └── availability.ts # CreateAvailabilitySchema
│   │   ├── routes/
│   │   │   ├── auth.ts        # Register, login, refresh, logout
│   │   │   ├── workspaces.ts  # Employee CRUD
│   │   │   ├── skills.ts      # Workspace skill CRUD
│   │   │   ├── employeeSkills.ts # Employee skill assignment
│   │   │   ├── shiftTemplates.ts # Shift template CRUD
│   │   │   ├── forecast.ts    # Forecast slot upsert/delete
│   │   │   └── availability.ts # Employee availability upsert/delete
│   │   └── index.ts           # Express app + global error handler
│   ├── src/tests/
│   │   ├── auth/
│   │   ├── workspaces/
│   │   ├── skills/            # skills.test.ts, employeeSkills.test.ts
│   │   ├── shiftTemplates/
│   │   ├── forecast/
│   │   ├── availability/
│   │   └── helpers.ts         # buildApp(), fixtures, mock Prisma
│   ├── Dockerfile
│   ├── .dockerignore
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddEmployeeModal.tsx
│   │   │   ├── NavBar.tsx     # Shared nav with active-link highlighting
│   │   │   └── ProtectedRoute.tsx
│   │   ├── hooks/
│   │   │   ├── useEmployees.ts
│   │   │   ├── useSkills.ts
│   │   │   ├── useEmployeeSkills.ts
│   │   │   ├── useShiftTemplates.ts
│   │   │   ├── useForecast.ts
│   │   │   └── useAvailability.ts
│   │   ├── lib/
│   │   │   ├── api.ts         # Axios + refresh interceptor
│   │   │   ├── store.ts       # Zustand auth store
│   │   │   └── types.ts       # Shared TS types (Employee, Skill, etc.)
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── SkillsPage.tsx
│   │   │   ├── ShiftTemplatesPage.tsx
│   │   │   ├── ForecastPage.tsx
│   │   │   └── AvailabilityPage.tsx
│   │   ├── tests/
│   │   │   ├── msw/           # MSW handlers + server setup
│   │   │   └── pages/         # Vitest component tests
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .dockerignore
│   └── vercel.json
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── .devcontainer/
│   ├── devcontainer.json
│   └── setup.sh
└── package.json
```

---

## Highlights

**Database design:** The memberships composite unique key enables multi-tenancy
without duplicating user records. Foreign key cascades ensure referential
integrity — deleting a workspace removes all memberships automatically.

**Auth:** Two separate JWT secrets mean a compromised refresh secret can't forge
access tokens. Refresh token rotation means a stolen token can only be used once
before it's invalidated.

**Type safety end-to-end:** Prisma generates TypeScript types from the schema,
Zod validates all inputs at the boundary, and the frontend uses the same shapes
via inferred types. A schema change propagates through the whole stack at
compile time.

**Upsert over create:** Forecast slots and availability windows use `PUT` with
composite unique keys rather than `POST` — the client sends the natural key
(day + time or day + startTime) and the server creates or updates as needed.
This removes the need for the frontend to track record IDs for editing.

**Middleware composition:** `requireAuth` and `requireRole` are composable
middlewares that attach data to the request object — route handlers receive a
fully populated `req.user` and `req.membership` with zero extra DB reads.
