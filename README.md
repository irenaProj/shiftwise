# ShiftWise 🗓️

> AI-powered shift scheduler — full-stack portfolio project

**Live demo:** https://shiftwise-app.vercel.app  
**API:** https://shiftwise-0sin.onrender.com/api/health

---

## What this is

A workforce management app where managers can schedule employees, handle shift swaps, and use AI to resolve scheduling conflicts. Built to demonstrate full-stack engineering across database design, REST API, auth, and a polished React UI.

**Hello World milestone (this branch):** A manager can register, create a workspace, add team members, and see them listed on a dashboard. Full stack wired end-to-end.

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
| Deployment | Vercel (FE) + Render (BE) + Neon (DB)           |

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

- Workspace: **Demo Cafe**
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

## API reference

### Auth

| Method | Endpoint             | Body                                     | Description                 |
| ------ | -------------------- | ---------------------------------------- | --------------------------- |
| POST   | `/api/auth/register` | `{email, password, name, workspaceName}` | Register + create workspace |
| POST   | `/api/auth/login`    | `{email, password}`                      | Login, get tokens           |
| POST   | `/api/auth/refresh`  | —                                        | Rotate refresh token        |
| POST   | `/api/auth/logout`   | —                                        | Invalidate refresh token    |

### Workspaces / Employees

| Method | Endpoint                                | Auth | Description       |
| ------ | --------------------------------------- | ---- | ----------------- |
| GET    | `/api/workspaces/:id/employees`         | ✅   | List all members  |
| POST   | `/api/workspaces/:id/employees`         | ✅   | Add a team member |
| DELETE | `/api/workspaces/:id/employees/:userId` | ✅   | Remove a member   |

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
7. Copy your Render URL — you'll need it for the frontend

> **Note:** The free tier spins down after 15 minutes of inactivity and takes
> ~30 seconds to wake up. This is fine for a portfolio project.

### Step 3 — Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → **New Project → Import** from GitHub
2. Set **Root Directory** to `frontend`
3. Add environment variable:

   | Variable       | Value                                                     |
   | -------------- | --------------------------------------------------------- |
   | `VITE_API_URL` | Your Render URL e.g. `https://shiftwise-api.onrender.com` |

4. Click **Deploy**

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
│   │   │   └── jwt.ts         # Token signing/verification
│   │   ├── middleware/
│   │   │   ├── auth.ts        # requireAuth middleware
│   │   │   └── logger.ts      # Request logger with duration
│   │   ├── routes/
│   │   │   ├── auth.ts        # Register, login, refresh, logout
│   │   │   └── workspaces.ts  # Employee CRUD
│   │   └── index.ts           # Express app
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
│   └── vercel.json
├── .github/workflows/ci.yml
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
- [ ] Milestone 4 — Shift templates & availability
- [ ] Milestone 5 — Constraint-based schedule generator
- [ ] Milestone 6 — AI integration (Claude API)
- [ ] Milestone 7–8 — Calendar UI with drag-and-drop
- [ ] Milestone 9 — Real-time updates (Socket.io)
- [ ] Milestone 10 — Shift swap requests
