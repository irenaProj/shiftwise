# Docker

## Overview

The project includes a full Docker setup for running the complete stack in
containers and producing production-ready images.

```
shiftwise/
├── docker-compose.yml          # Full stack: postgres + backend + frontend
├── docker-compose.dev.yml      # Dev overrides with hot reload
├── .env.example                # Environment variable template
├── backend/
│   ├── Dockerfile              # Multi-stage: builder + production (node/alpine)
│   └── .dockerignore
└── frontend/
    ├── Dockerfile              # Multi-stage: builder + production (nginx/alpine)
    ├── nginx.conf              # React Router support + asset caching
    └── .dockerignore
```

---

## Running locally

### Prerequisites

Docker Desktop installed and running on your machine.

### Step 1 — Create `.env`

```bash
cp .env.example .env
```

Fill in your values:

```
JWT_ACCESS_SECRET=your-64-char-hex-string
JWT_REFRESH_SECRET=your-different-64-char-hex-string
FRONTEND_URL=http://localhost:80
VITE_API_URL=http://localhost:3001
```

Generate JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Step 2 — Build and start

```bash
docker compose up --build
```

Three containers start:
- `shiftwise_db` — PostgreSQL 16 on port 5432
- `shiftwise_api` — Express API on port 3001
- `shiftwise_fe` — nginx serving React on port 80

### Step 3 — Migrate and seed (first time only)

```bash
docker compose exec backend sh -c "cd backend && npx prisma migrate deploy"
docker compose exec backend sh -c "cd backend && npx tsx prisma/seed.ts"
```

### Step 4 — Open the app

Go to http://localhost:80 and log in with `will.power@demo.com` / `password123`.

---

## Tear down and reset

```bash
# Stop containers and wipe the database volume
docker compose down -v

# Rebuild fresh
docker compose up --build -d
sleep 10
docker compose exec backend sh -c "cd backend && npx prisma migrate deploy"
docker compose exec backend sh -c "cd backend && npx tsx prisma/seed.ts"
```

The `-v` flag removes the `postgres_data` volume — the database starts completely empty.

---

## Hot reload in development

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Source files are mounted as volumes so changes hot-reload without rebuilding
the image.

---

## Running in Codespaces

> **Note:** Docker-in-Docker is not reliably supported in GitHub Codespaces.
> Use `npm run dev` for day-to-day development in Codespaces instead.

If you do need to run Docker in Codespaces, Codespaces uses forwarded URLs
instead of `localhost`. Get your URLs first:

```bash
echo "Frontend: https://${CODESPACE_NAME}-80.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
echo "Backend:  https://${CODESPACE_NAME}-3001.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
```

Update `.env` with the actual URLs (no variable expansion — paste the real values):

```
FRONTEND_URL=https://your-codespace-80.app.github.dev
VITE_API_URL=https://your-codespace-3001.app.github.dev
```

After building, go to the **Ports** tab in VS Code and set ports `80` and
`3001` to **Public** visibility.

> Codespaces URLs change when you create a new Codespace — update `.env` and
> rebuild when this happens.

---

## Multi-stage build explained

Both Dockerfiles use multi-stage builds to keep production images lean:

**Backend:**
```
Stage 1 (builder)  — installs all deps, generates Prisma client, compiles TypeScript
Stage 2 (production) — installs prod deps only, copies compiled dist/
```

**Frontend:**
```
Stage 1 (builder)  — installs all deps, runs vite build
Stage 2 (production) — nginx/alpine, copies dist/ only
```

The production images contain no TypeScript source, no devDependencies, and
no build tools — just what's needed to run.

---

## Why Docker?

- **Consistency** — identical environment locally, in CI, and in production
- **Onboarding** — one command gets a new developer the full stack
- **Production parity** — test against the same nginx + node/alpine used in production
- **Interview talking point** — multi-stage builds, layer caching, health checks, volume management

> **Tip:** Use `npm run dev` for active development — it's faster and
> breakpoints work out of the box. Use Docker to verify production builds
> before deploying.
