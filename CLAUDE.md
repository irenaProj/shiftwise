# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ShiftWise is a full-stack workforce scheduling app. It is a monorepo (npm workspaces) with three packages:
- `backend/` — Express + TypeScript API
- `frontend/` — React + Vite + TypeScript SPA
- `packages/dates/` — Shared date/timezone utilities (`@shiftwise/dates`)

## Commands

### Development
```bash
npm run dev              # Start both backend (port 3001) and frontend (port 5173) concurrently
```

### Backend
```bash
cd backend
npm run dev              # tsx watch mode
npm run build            # tsc compile to dist/
npm run test             # Jest
npm run test:watch       # Jest watch
npm run test:coverage    # Jest with coverage
npm run db:migrate       # Prisma interactive migration
npm run db:generate      # Regenerate Prisma client after schema changes
npm run db:seed          # Seed DB with fixtures
npm run db:studio        # Prisma Studio GUI
```

### Frontend
```bash
cd frontend
npm run dev              # Vite dev server
npm run build            # tsc + vite build
npm run test             # Vitest single run
npm run test:watch       # Vitest watch
npm run test:coverage    # Vitest with coverage
```

### E2E
```bash
npm run e2e              # Playwright (from repo root)
npm run e2e:ui           # Playwright with UI
npm run e2e:report       # Show last report
```

### Single test file
```bash
# Backend
cd backend && npx jest src/tests/auth/auth.test.ts

# Frontend
cd frontend && npx vitest run src/tests/pages/LoginPage.test.tsx
```

## Architecture

### Auth Flow
JWT access tokens (15 min) + httpOnly cookie refresh tokens (7 days). Refresh tokens are stored in the database and rotated on each use. The frontend Axios client auto-refreshes on 401 via interceptor (`frontend/src/lib/api.ts`).

### Multi-tenancy
All resources are scoped to a **Workspace**. The **Membership** table joins User ↔ Workspace with a role (`OWNER`, `MANAGER`, `EMPLOYEE`). Route middleware verifies workspace membership and role before any data access.

### Backend structure
```
backend/src/
├── index.ts          # Express app bootstrap
├── middleware/       # auth.ts (JWT verify), logger.ts
├── routes/           # One file per resource (auth, workspaces, skills, shiftTemplates, forecast, availability)
├── lib/              # jwt.ts, prisma.ts (singleton), errors.ts (AppError), responses.ts
└── validation/       # Zod schemas co-located with routes
```

### Frontend structure
```
frontend/src/
├── App.tsx           # React Router v6 layout & protected routes
├── pages/            # Full-page route components
├── components/       # Reusable UI components
├── hooks/            # TanStack Query hooks (useSkills, useAvailability, etc.)
├── lib/
│   ├── api.ts        # Axios instance with auth interceptors
│   ├── store.ts      # Zustand auth store
│   └── types.ts      # Shared TypeScript types
└── tests/            # Vitest tests + MSW handlers
```

### Data model highlights
- `Membership` is the central join table — always filter by both `workspaceId` and `userId`
- `ForecastSlot` and `Availability` use composite unique keys for upsert semantics
- Cascading deletes are defined at the schema level

### Dates package
`packages/dates/` exports UTC and timezone-aware adapters built on `date-fns` v4 + `@date-fns/tz`. Import as `@shiftwise/dates`. Do not import `date-fns` directly in shared logic; use this package.

## Testing Strategy

**Backend** — Jest + Supertest with a fully mocked Prisma client (`jest-mock-extended`). No real database required. Test helpers are in `backend/src/tests/helpers.ts`.

**Frontend** — Vitest + React Testing Library. MSW handlers in `frontend/src/tests/msw/` intercept API calls. Use `renderWithProviders` from `frontend/src/tests/utils.tsx` for components that need the query client or router.

**E2E** — Playwright (single Chromium worker). Runs against a real E2E database seeded via `e2e/seed.ts`. CI applies migrations (`prisma migrate deploy`) before seeding.

## Environment Variables

Copy `.env.example` to `.env` in the repo root. Required variables:
- `DATABASE_URL` — Postgres connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- `E2E_DATABASE_URL` — separate DB for Playwright tests

The frontend dev server proxies `/api/*` to `http://localhost:3001` (configured in `frontend/vite.config.ts`).

## Database Migrations

After editing `backend/prisma/schema.prisma`:
```bash
cd backend && npm run db:migrate   # creates migration file + applies it
npm run db:generate                # regenerate Prisma client
```

In CI / production, migrations are applied with `prisma migrate deploy` (non-interactive).
