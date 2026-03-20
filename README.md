# ShiftWise 🗓️

> AI-powered shift scheduler — full-stack portfolio project

**Live demo:** https://shiftwise-app.vercel.app  
**API:** https://shiftwise-0sin.onrender.com/api/health

---

## What this is

A workforce management app where managers can schedule employees, handle shift
swaps, and use AI to resolve scheduling conflicts. Built to demonstrate
full-stack engineering across database design, REST API, auth, and a polished
React UI.

**Hello World milestone (this branch):** A manager can register, create a
workspace, add team members, and see them listed on a dashboard. Full stack
wired end-to-end.

---

## Tech stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS        |
| State      | Zustand (client), TanStack Query (server)       |
| Backend    | Node.js, Express, TypeScript                    |
| Database   | PostgreSQL via Prisma ORM                       |
| Auth       | JWT (access) + httpOnly cookie (refresh)        |
| Dates      | date-fns v4, @date-fns/utc, @date-fns/tz        |
| Container  | Docker + nginx                                  |
| Deployment | Vercel (FE) + Render (BE) + Neon (DB)           |
| CI/CD      | GitHub Actions                                  |

---

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

## @shiftwise/dates

A shared date utility package used by both the backend and frontend. It wraps
`date-fns` v4, `@date-fns/utc`, and `@date-fns/tz` behind an Adapter + Facade
pattern so the underlying library is never imported directly outside this package.

### Design principles

- **UTC everywhere except the display layer.** All dates are stored, exchanged,
  and calculated as UTC ISO strings (`"2026-03-18T09:00:00.000Z"`). Timezone
  conversion happens only at the point of display in the UI.
- **`UTCDate` instead of `new Date()`.** All internal operations use `UTCDate`
  from `@date-fns/utc` to prevent local timezone bleed during calculations.
- **`format` with `{ in: tz() }`.** Display formatting uses the date-fns v4
  `{ in }` option rather than deprecated helpers like `toZonedTime`.
- **Swappable internals.** `utc.ts` and `display.ts` are the only files that
  know about the underlying libraries. Swapping `date-fns` for another library
  means editing one file — nothing else changes.

### Package structure

```
packages/dates/src/
├── types.ts      # Shared types: DateInput, ISOString, ShiftWindow, Timezone
├── utc.ts        # UTC operations — safe on backend and frontend
├── display.ts    # Localisation — frontend presentational layer only
└── index.ts      # Public facade — the only import consumers use
```

### What lives where

| Module       | Imports                             | Used by   |
| ------------ | ----------------------------------- | --------- |
| `utc.ts`     | `@date-fns/utc`, `date-fns`         | BE + FE   |
| `display.ts` | `@date-fns/tz`, `date-fns` `{ in }` | FE only   |
| `index.ts`   | re-exports both                     | BE + FE   |

### Usage

**Backend — scheduler and routes:**

```typescript
import { buildShiftWindow, doShiftsOverlap, hasMinRest, getWeekDays } from '@shiftwise/dates'

const shiftA = buildShiftWindow('2026-03-18T00:00:00.000Z', '09:00', '17:00')
const shiftB = buildShiftWindow('2026-03-18T00:00:00.000Z', '14:00', '22:00')

doShiftsOverlap(shiftA, shiftB) // true
hasMinRest(shiftA.end, shiftB.start) // false — only 5hr gap, need 8
getWeekDays('2026-03-18T00:00:00.000Z') // [UTCDate, UTCDate, ...x7]
```

**Frontend — calendar display:**

```typescript
import { formatShiftTime, formatShiftDate, localTimeToUTC } from '@shiftwise/dates'

// Display UTC shift in user's timezone
formatShiftTime('2026-03-17T22:00:00.000Z', 'Australia/Sydney') // "9:00 AM"
formatShiftDate('2026-03-17T22:00:00.000Z', 'Australia/Sydney') // "Tue 18 Mar"

// Convert manager's local time input to UTC before sending to API
localTimeToUTC('2026-03-18', '09:00', 'Australia/Sydney')
// → "2026-03-17T22:00:00.000Z"
```

### Timezone model

Each user and workspace stores an IANA timezone string. User timezone takes
priority over workspace timezone — this handles cases where a manager in one
city is scheduling staff in another.

```
users.timezone      "Australia/Sydney"   (user override)
workspaces.timezone "Pacific/Auckland"   (workspace default)
```

### Updating the package

Since the package points directly at `.ts` source files (no build step),
changes are picked up automatically:

- **Edit a file** → backend (`tsx watch`) and frontend (Vite) hot-reload instantly
- **Add a dependency** → run `npm install` from the monorepo root
- **Typecheck everything** → `npm run typecheck` from the monorepo root

---

## Local development

### Prerequisites

- Node.js 20+
- A PostgreSQL database (Neon free tier recommended)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/shiftwise.git
cd shiftwise
npm install          # installs root + all workspaces
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[HOST]/[DBNAME]?sslmode=require"
JWT_ACCESS_SECRET="run: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
JWT_REFRESH_SECRET="run the same command again for a different value"
FRONTEND_URL="http://localhost:5173"
```

### 3. Set up the database

```bash
cd backend
npm run db:migrate    # creates tables
npm run db:generate   # generates Prisma client
npm run db:seed       # creates demo workspace + users
```

Seed creates:

- Workspace: **Demo Cafe** (timezone: Australia/Sydney)
- Manager: `will.power@demo.com` / `password123`
- Employees: `lou.poles@demo.com`, `fran.tastic@demo.com`, `zack.lee@demo.com` / `password123`

### 4. Run the app

```bash
# From the root — runs backend and frontend concurrently
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Prisma Studio: `cd backend && npm run db:studio`

**In Codespaces:** click the **Ports** tab at the bottom, find port `5173`,
and click the 🌐 globe icon to open it in the browser.

---

## Docker

The project includes a full Docker setup for running the complete stack locally
in containers, and for producing production-ready images.

### Prerequisites

- Docker Desktop installed and running

### Files

```
shiftwise/
├── docker-compose.yml          # Full stack: postgres + backend + frontend
├── docker-compose.dev.yml      # Dev overrides with hot reload
├── .env.example                # Environment variable template for Docker
├── backend/
│   ├── Dockerfile              # Multi-stage: builder + production (node/alpine)
│   └── .dockerignore
└── frontend/
    ├── Dockerfile              # Multi-stage: builder + production (nginx/alpine)
    ├── nginx.conf              # React Router support + asset caching
    └── .dockerignore
```

### Running with Docker

**Step 1 — Create your `.env` file**

```bash
cp .env.example .env
```

Edit `.env` with your values:

```
JWT_ACCESS_SECRET=your-64-char-hex-string
JWT_REFRESH_SECRET=your-different-64-char-hex-string
FRONTEND_URL=http://localhost:80
VITE_API_URL=http://localhost:3001
```

Generate JWT secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Step 2 — Build and start**

```bash
docker compose up --build
```

This starts three containers:
- `shiftwise_db` — PostgreSQL 16 on port 5432
- `shiftwise_api` — Express API on port 3001
- `shiftwise_fe` — nginx serving React on port 80

**Step 3 — Run migrations and seed (first time only)**

In a second terminal:

```bash
docker compose exec backend sh -c "cd backend && npx prisma migrate deploy"
docker compose exec backend sh -c "cd backend && npx tsx prisma/seed.ts"
```

**Step 4 — Open the app**

Go to http://localhost:80 and log in with `will.power@demo.com` / `password123`.

### Tear down and reset

```bash
# Stop containers and wipe the database volume
docker compose down -v

# Rebuild and start fresh
docker compose up --build -d
sleep 10
docker compose exec backend sh -c "cd backend && npx prisma migrate deploy"
docker compose exec backend sh -c "cd backend && npx tsx prisma/seed.ts"
```

### Running in Codespaces with Docker

Codespaces uses forwarded URLs instead of `localhost`. You need to set the
actual Codespaces URLs in your `.env` before building:

```bash
# Get your URLs
echo "Frontend: https://${CODESPACE_NAME}-80.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
echo "Backend:  https://${CODESPACE_NAME}-3001.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
```

Update `.env` with these URLs (no quotes, no variable expansion):

```
FRONTEND_URL=https://your-codespace-name-80.app.github.dev
VITE_API_URL=https://your-codespace-name-3001.app.github.dev
```

> **Important:** After building, go to the **Ports** tab in VS Code and set
> ports `80` and `3001` to **Public** visibility — otherwise the browser
> can't reach the containers.

> **Note:** Codespaces URLs change when you create a new Codespace. Update
> `.env` and rebuild when this happens.

### Hot reload in development

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

This mounts source files as volumes so changes hot-reload without rebuilding
the image.

### Why Docker?

- **Consistency** — identical environment in Codespaces, locally, and in CI
- **Onboarding** — new developers run one command to get the full stack running
- **Production parity** — test against the same nginx + node/alpine setup used in production
- **Interview talking point** — multi-stage builds, layer caching, health checks

> **Tip:** For active day-to-day development, `npm run dev` is faster and
> supports breakpoints out of the box. Use Docker to test production builds
> before deploying.

---

## CI/CD

### GitHub Actions workflows

```
.github/workflows/
├── ci.yml        # Runs on every push and PR — type checks backend and frontend
└── deploy.yml    # Runs on push to main — triggers Render backend redeploy
```

### CI workflow (`ci.yml`)

Runs on every push and pull request:
- Type checks the backend (`tsc --noEmit`)
- Type checks the frontend (`tsc && vite build`)
- Both must pass before merging

### Deploy workflow (`deploy.yml`)

Runs automatically on every push to `main`:
- Triggers a Render deploy hook for the backend
- Vercel redeploys the frontend automatically via its own GitHub integration

### Required GitHub repository secrets

| Secret | Description |
|--------|-------------|
| `RENDER_DEPLOY_HOOK_BACKEND` | Render deploy hook URL for the backend service |

Get the Render deploy hook from: **Render dashboard → your service → Settings → Deploy Hook**

### Debugging

Vercel builds and Render deploys are both visible in their respective dashboards.
GitHub Actions logs are in your repo under **Actions** tab.

---

## API reference

### Auth

| Method | Endpoint             | Body                                     | Description                 |
| ------ | -------------------- | ---------------------------------------- | --------------------------- |
| POST   | `/api/auth/register` | `{email, password, name, workspaceName}` | Register + create workspace |
| POST   | `/api/auth/login`    | `{email, password}`                      | Login, get tokens           |
| POST   | `/api/auth/refresh`  | —                                        | Rotate refresh token        |
| POST   | `/api/auth/logout`   | —                                        | Invalidate refresh token    |

### Workspaces / Employees

| Method | Endpoint                                | Auth | Role          | Description       |
| ------ | --------------------------------------- | ---- | ------------- | ----------------- |
| GET    | `/api/workspaces/:id/employees`         | ✅   | Any member    | List all members  |
| POST   | `/api/workspaces/:id/employees`         | ✅   | Owner/Manager | Add a team member |
| DELETE | `/api/workspaces/:id/employees/:userId` | ✅   | Owner/Manager | Remove a member   |

### Error responses

All errors follow a consistent format:

```json
{
  "error": "Human readable message",
  "code": "MACHINE_READABLE_CODE"
}
```

| Code | Status | Description |
|------|--------|-------------|
| `BAD_REQUEST` | 400 | Invalid input or validation failure |
| `UNAUTHORIZED` | 401 | Missing, invalid, or expired token |
| `FORBIDDEN` | 403 | Authenticated but insufficient role |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Resource already exists |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

In development, `500` errors also include a `stack` field for debugging.

---

## Deployment guide

### Step 1 — Database (Neon)

1. Go to [neon.tech](https://neon.tech) → New project
2. Name it `shiftwise`, pick the closest region
3. Copy the connection string from **Dashboard → Connection string** — format:
   ```
   postgresql://[USER]:[PASSWORD]@[HOST]/[DBNAME]?sslmode=require
   ```

### Step 2 — Backend (Render)

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Set these options:
   - **Root directory:** `backend`
   - **Build command:** `npm install && npx prisma generate && npm run build`
   - **Start command:** `node dist/index.js`
4. Add environment variables:

   | Variable             | Value                               |
   | -------------------- | ----------------------------------- |
   | `DATABASE_URL`       | Your Neon connection string         |
   | `JWT_ACCESS_SECRET`  | Random 64-char hex string           |
   | `JWT_REFRESH_SECRET` | Different random 64-char hex string |
   | `FRONTEND_URL`       | `https://your-app.vercel.app`       |
   | `NODE_ENV`           | `production`                        |
   | `PORT`               | `3001`                              |

   Generate JWT secrets with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

5. Click **Deploy**
6. After first deploy, run migrations from the Render shell:
   ```bash
   npx prisma migrate deploy && npx tsx prisma/seed.ts
   ```
7. Go to **Settings → Deploy Hook** → copy the URL
8. Add it as `RENDER_DEPLOY_HOOK_BACKEND` in GitHub repository secrets

> **Note:** The free tier spins down after 15 minutes of inactivity and takes
> ~30 seconds to wake up. This is fine for a portfolio project.

### Step 3 — Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → **New Project → Import** from GitHub
2. Set **Root Directory** to `frontend`
3. Add environment variable:

   | Variable       | Value                                                     |
   | -------------- | --------------------------------------------------------- |
   | `VITE_API_URL` | Your Render URL e.g. `https://shiftwise-api.onrender.com` |

4. Click **Deploy** — Vercel will redeploy automatically on every push to `main`

### Step 4 — Update CORS

Once you have your Vercel URL, update `FRONTEND_URL` in Render to match exactly:

```
FRONTEND_URL=https://shiftwise-app.vercel.app
```

---

## Full project structure

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
│   │   ├── routes/
│   │   │   ├── auth.ts        # Register, login, refresh, logout
│   │   │   └── workspaces.ts  # Employee CRUD
│   │   └── index.ts           # Express app + global error handler
│   ├── Dockerfile
│   ├── .dockerignore
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddEmployeeModal.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── lib/
│   │   │   ├── api.ts         # Axios + refresh interceptor
│   │   │   └── store.ts       # Zustand auth store
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   └── DashboardPage.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── .dockerignore
│   └── vercel.json
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example               # Docker environment template
├── .github/
│   └── workflows/
│       ├── ci.yml             # Type check on push + PR
│       └── deploy.yml         # Deploy to Render on push to main
├── .devcontainer/
│   ├── devcontainer.json      # Codespaces config
│   └── setup.sh               # Auto-setup script
└── package.json               # npm workspaces root
```

---

## Roadmap

- [x] Milestone 1 — Project scaffold, schema, Express app
- [x] Milestone 2 — Auth: register, login, JWT, refresh token rotation
- [x] Milestone 3 — Employee management CRUD
- [x] Shared dates package — UTC adapter + display facade
- [x] Docker — multi-stage builds, docker-compose, nginx
- [x] CI/CD — GitHub Actions, Render deploy hooks, Vercel auto-deploy
- [ ] Milestone 4 — Shift templates & availability
- [ ] Milestone 5 — Constraint-based schedule generator
- [ ] Milestone 6 — AI integration (Claude API)
- [ ] Milestone 7–8 — Calendar UI with drag-and-drop
- [ ] Milestone 9 — Real-time updates (Socket.io)
- [ ] Milestone 10 — Shift swap requests

---

## Interview talking points

**Database design:** The `memberships` table with a composite unique key on
`(userId, workspaceId)` enables multi-tenant workspaces without duplicating
user records. A user can belong to multiple workspaces with different roles.

**Auth:** Refresh tokens are stored as httpOnly cookies (XSS-proof) with
rotation on each use. Access tokens are short-lived (15min) and never
persisted. A failed refresh redirects to login cleanly.

**Type safety end-to-end:** Prisma generates TypeScript types from the schema,
Zod validates all inputs, and the frontend uses the same shape via inferred
types. A schema change propagates through the whole stack at compile time.

**Date handling:** All dates are stored and exchanged as UTC ISO strings. The
`@shiftwise/dates` package wraps `date-fns` v4 behind an Adapter + Facade
pattern — `UTCDate` is used for all calculations to prevent local timezone
bleed, and the `{ in: tz() }` option in `format` handles localisation at the
display layer only. Swapping the underlying library requires changing one file.

**Monorepo:** npm workspaces links `backend`, `frontend`, and `packages/dates`
together with a single `npm install` at the root. The shared dates package has
no build step — both consumers point directly at the TypeScript source, so
changes hot-reload instantly in both `tsx watch` and Vite.

**Error handling:** A custom `AppError` class with convenience factories
(`Forbidden`, `Unauthorized`, `Conflict` etc.) replaces scattered
`res.status().json()` calls. A global error handler catches everything —
known errors return structured `{ error, code }` JSON, unknown errors
propagate the message in development and hide internals in production.

**Docker:** Multi-stage builds produce lean production images — the builder
stage compiles TypeScript and the production stage copies only the compiled
output, keeping the image small. The frontend uses nginx with a custom config
to handle React Router and cache static assets.

**CI/CD:** GitHub Actions runs type checks on every push and PR. On merge to
`main`, a deploy hook triggers Render to redeploy the backend, while Vercel
deploys the frontend automatically via its GitHub integration. No manual
deploys needed.