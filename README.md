# ShiftWise 🗓️

> AI-powered shift scheduler — full-stack portfolio project

**Live demo:** https://shiftwise-app.vercel.app  
**API:** https://shiftwise-0sin.onrender.com/api/health  
**Docs:** https://irenaproj.github.io/shiftwise/

---

## What this is

A workforce management app where managers can schedule employees, handle shift
swaps, and use AI to resolve scheduling conflicts. Built to demonstrate
full-stack engineering across database design, REST API, auth, real-time
updates, and a polished React UI.

**Current milestone:** A manager can register, create a workspace, add and
remove team members, and see them listed on a dashboard. Full stack wired
end-to-end with auth, RBAC, error handling, and a test suite.

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
| Testing    | Jest + Supertest (BE), Vitest + Playwright (FE) |
| Container  | Docker + nginx                                  |
| Deployment | Vercel (FE) + Render (BE) + Neon (DB)           |
| CI/CD      | GitHub Actions                                  |

---

## Quick start

```bash
git clone https://github.com/YOUR_USERNAME/shiftwise.git
cd shiftwise
npm install
cd backend && cp .env.example .env  # fill in DATABASE_URL + JWT secrets
npm run db:migrate && npm run db:seed
cd .. && npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Login: `will.power@demo.com` / `password123`

---

## Documentation

| Doc                                                          | Description                                   |
| ------------------------------------------------------------ | --------------------------------------------- |
| [Architecture](docs/architecture.md)                         | System design, data model, monorepo structure |
| [API Reference](docs/api.md)                                 | Endpoints, auth, error codes                  |
| [Testing](docs/testing.md)                                   | Test strategy, running tests, CI              |
| [Deployment](docs/deployment.md)                             | Render, Vercel, Neon, GitHub Actions          |
| [Docker](docs/docker.md)                                     | Local Docker setup, Codespaces notes          |
| [Dates Package](docs/dates-package.md)                       | @shiftwise/dates design and usage             |
| [GitHub Setup](docs/github-setup.md)                         | Secrets, Pages, branch protection, Codespaces |
| [API Docs (TypeDoc)](https://irenaProj.github.io/shiftwise/) | Generated docs from JSDoc comments            |

---

## Roadmap

- [x] Milestone 1 — Project scaffold, schema, Express app
- [x] Milestone 2 — Auth: register, login, JWT, refresh token rotation
- [x] Milestone 3 — Employee management CRUD
- [x] Shared dates package — UTC adapter + display facade
- [x] Docker — multi-stage builds, docker-compose, nginx
- [x] CI/CD — GitHub Actions, Render deploy hooks, Vercel auto-deploy
- [x] Testing — Jest + Supertest backend tests with mocked Prisma
- [ ] Milestone 4 — Shift templates & availability
- [ ] Milestone 5 — Constraint-based schedule generator
- [ ] Milestone 6 — AI integration (Claude API)
- [ ] Milestone 7–8 — Calendar UI with drag-and-drop
- [ ] Milestone 9 — Real-time updates (Socket.io)
- [ ] Milestone 10 — Shift swap requests
