# ShiftWise 🗓️

> AI-powered shift scheduler — full-stack portfolio project

**Live demo:** https://shiftwise.vercel.app  
**API:** https://shiftwise-api.Render.app/api/health

---

## What this is

A workforce management app where managers can schedule employees, handle shift swaps, and use AI to resolve scheduling conflicts. Built to demonstrate full-stack engineering across database design, REST API, auth, and a polished React UI.

**Hello World milestone (this branch):** A manager can register, create a workspace, add team members, and see them listed on a dashboard. Full stack wired end-to-end.

---

## Tech stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS        |
| State      | Zustand (client), TanStack Query (server)       |
| Backend    | Node.js, Express, TypeScript                    |
| Database   | PostgreSQL via Prisma ORM                       |
| Auth       | JWT (access) + httpOnly cookie (refresh)        |
| Deployment | Vercel (FE) + Render (BE) + Supabase (DB)      |

---

## Local development

### Prerequisites
- Node.js 20+
- A PostgreSQL database (local or Supabase free tier)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/shiftwise.git
cd shiftwise
npm install          # installs root + both workspaces
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
- Manager: `manager@demo.com` / `password123`
- Employees: `alice@demo.com`, `bob@demo.com`, `carol@demo.com` / `password123`


### 4. Run the app

```bash
# From the root — runs both backend and frontend concurrently
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Prisma Studio: `cd backend && npm run db:studio`

---

## API reference

### Auth

| Method | Endpoint             | Body                                   | Description              |
|--------|----------------------|----------------------------------------|--------------------------|
| POST   | `/api/auth/register` | `{email, password, name, workspaceName}` | Register + create workspace |
| POST   | `/api/auth/login`    | `{email, password}`                    | Login, get tokens        |
| POST   | `/api/auth/refresh`  | —                                      | Rotate refresh token     |
| POST   | `/api/auth/logout`   | —                                      | Invalidate refresh token |

### Workspaces / Employees

| Method | Endpoint                                      | Auth | Description         |
|--------|-----------------------------------------------|------|---------------------|
| GET    | `/api/workspaces/:id/employees`               | ✅   | List all members    |
| POST   | `/api/workspaces/:id/employees`               | ✅   | Add a team member   |
| DELETE | `/api/workspaces/:id/employees/:userId`       | ✅   | Remove a member     |

---

## Deployment guide

### Step 1 — Database (Neon)

1. Go to [neon.tech](neon.tech) → New project
2. Connection string → copy it
3. Keep this for Step 2

## Backend Deployment (Render)

1. Go to [render.com](https://render.com) and sign up
2. Click **New → Web Service**
3. Connect your GitHub repo and select it
4. Set these options:
   - **Root directory:** `backend`
   - **Build command:** `npm install && npx prisma generate && npm run build`
   - **Start command:** `node dist/index.js`
5. Add environment variables:

   | Variable | Value |
   |----------|-------|
   | `DATABASE_URL` | Your Neon connection string |
   | `JWT_ACCESS_SECRET` | Random 64-char hex string |
   | `JWT_REFRESH_SECRET` | Different random 64-char hex string |
   | `FRONTEND_URL` | `https://your-app.vercel.app` |
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` |

   Generate JWT secrets with:
```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

6. Click **Deploy**
7. Copy your Render URL (e.g. `https://shiftwise-api.onrender.com`) — you'll need it for the frontend

> **Note:** The free tier spins down after 15 minutes of inactivity and takes ~30 seconds to wake up on the next request. This is fine for a portfolio project.


### Step 3 — Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → New project → Import from GitHub
2. Set **Root Directory** to `frontend`
3. Add environment variable:
   ```
   VITE_API_URL=https://shiftwise-api.up.render.app
   ```
4. Deploy

**Important:** Update the Vite proxy. In production, `axios` needs the full API URL. In `frontend/src/lib/api.ts`, change:
```ts
// Development (uses Vite proxy):
baseURL: '/api'

// Production (direct to Render):
baseURL: import.meta.env.VITE_API_URL + '/api'
```

Or use this pattern that handles both:
```ts
baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api'
```

### Step 4 — Update CORS

Once you have your Vercel URL, update `FRONTEND_URL` in Render to match exactly:
```
FRONTEND_URL=https://shiftwise.vercel.app
```

---

## Project structure

```
shiftwise/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # DB schema
│   │   └── seed.ts            # Demo data
│   ├── src/
│   │   ├── lib/
│   │   │   ├── prisma.ts      # Prisma singleton
│   │   │   └── jwt.ts         # Token signing/verification
│   │   ├── middleware/
│   │   │   └── auth.ts        # requireAuth middleware
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
└── package.json
```

---

## Roadmap

- [x] Milestone 1 — Project scaffold, schema, Express app
- [x] Milestone 2 — Auth: register, login, JWT, refresh token rotation
- [x] Milestone 3 — Employee management CRUD
- [ ] Milestone 4 — Shift templates & availability
- [ ] Milestone 5 — Constraint-based schedule generator
- [ ] Milestone 6 — AI integration (Claude API)
- [ ] Milestone 7–8 — Calendar UI with drag-and-drop
- [ ] Milestone 9 — Real-time updates (Socket.io)
- [ ] Milestone 10 — Shift swap requests

---

## Interview talking points

**Database design:** The `memberships` table with a composite unique key on `(userId, workspaceId)` enables multi-tenant workspaces without duplicating user records. A user can belong to multiple workspaces with different roles.

**Auth:** Refresh tokens are stored as httpOnly cookies (XSS-proof) with rotation on each use. Access tokens are short-lived (15min) and never persisted. A failed refresh redirects to login cleanly.

**Type safety end-to-end:** Prisma generates TypeScript types from the schema, Zod validates all inputs, and the frontend uses the same shape via inferred types. A schema change propagates through the whole stack at compile time.
