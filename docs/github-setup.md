# GitHub Setup

Things that need to be configured directly on GitHub — these can't be committed
to the repo but are required for CI/CD, docs, and deployment to work correctly.

---

## Repository secrets

Go to: **GitHub repo → Settings → Secrets and variables → Actions → Repository secrets**

| Secret                       | Value                                 | Used by                                  |
| ---------------------------- | ------------------------------------- | ---------------------------------------- |
| `RENDER_DEPLOY_HOOK_BACKEND` | Render deploy hook URL                | `deploy.yml` — triggers backend redeploy |
| `JWT_ACCESS_SECRET`          | 64-char hex string                    | Backend on Render + E2E CI               |
| `JWT_REFRESH_SECRET`         | 64-char hex string                    | Backend on Render + E2E CI               |
| `E2E_DATABASE_URL`           | Neon testing branch connection string | `ci.yml` — E2E isolated backend          |

> **Critical:** `E2E_DATABASE_URL` must be added as a GitHub secret. Without it
> the E2E backend starts with an empty `DATABASE_URL` and all login attempts fail
> silently — tests stay on `/login` with no error shown.

### Getting each value

**`RENDER_DEPLOY_HOOK_BACKEND`**
Render dashboard → your backend service → **Settings** → scroll to **Deploy Hook** → copy URL

**`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`**
Generate fresh values:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**`E2E_DATABASE_URL`**
Neon dashboard → your project → **Branches → testing** → Connection string

---

## Repository variables

Go to: **GitHub repo → Settings → Secrets and variables → Actions → Variables tab**

| Variable       | Value                              | Used by                                                    |
| -------------- | ---------------------------------- | ---------------------------------------------------------- |
| `E2E_BASE_URL` | `https://shiftwise-app.vercel.app` | `ci.yml` — Playwright smoke tests vs production (optional) |

---

## GitHub Pages

Required for the docs site and TypeDoc API documentation.

Go to: **GitHub repo → Settings → Pages**

| Setting | Value                    |
| ------- | ------------------------ |
| Source  | **Deploy from a branch** |
| Branch  | `main`                   |
| Folder  | `/docs`                  |

Once set, the docs site is available at:

```
https://irenaproj.github.io/shiftwise/
```

TypeDoc API docs are at:

```
https://irenaproj.github.io/shiftwise/api/
```

The `docs.yml` workflow regenerates TypeDoc and commits it back to `docs/api/`
automatically when files in `packages/dates/src/`, `backend/src/lib/`, or
`backend/src/middleware/` change.

---

## Actions permissions

Go to: **GitHub repo → Settings → Actions → General**

| Setting              | Value                                        |
| -------------------- | -------------------------------------------- |
| Actions permissions  | **Allow all actions and reusable workflows** |
| Workflow permissions | **Read and write permissions**               |

**Read and write permissions** is required for the `docs.yml` workflow to
commit TypeDoc output back to the repo.

---

## Branch protection (recommended)

Go to: **GitHub repo → Settings → Branches → Add branch ruleset**

Suggested rules for `main`:

| Rule                              | Value                                                                                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Require status checks to pass     | ✅ — add `Backend — type check & build`, `Frontend — type check & build`, `Backend — Jest tests`, `Frontend — Vitest tests`, `E2E — Playwright` |
| Require branches to be up to date | ✅                                                                                                                                              |
| Block force pushes                | ✅                                                                                                                                              |

This ensures no code reaches `main` without passing all CI jobs — the deploy
workflow only runs on `main`, so broken code never gets deployed.

---

## Neon database branches

### Production branch

Used by the live app on Render.

Neon dashboard → your project → **Branches → production** → Connection string

Add to Render environment variables as `DATABASE_URL`.

### Testing branch

Used exclusively by E2E tests in CI and locally — completely isolated from
production data.

1. Neon dashboard → your project → **Branches → Create branch**
2. Name: `testing`, Parent: `production`
3. Data: **Schema only** — the seed script handles data
4. **Uncheck** auto-delete
5. Copy the connection string
6. Add as `E2E_DATABASE_URL` in GitHub repository secrets
7. Add to root `.env` locally as `E2E_DATABASE_URL=...`

The testing branch is wiped and reseeded with known data before every
Playwright run — tests always start from a clean predictable state.

---

## Codespaces

Go to: **GitHub repo → Settings → Codespaces**

| Setting                | Recommended value                       |
| ---------------------- | --------------------------------------- |
| Prebuild configuration | Optional — speeds up Codespace creation |
| Machine type           | 2-core (sufficient for this project)    |

### Codespace secrets

Add at: **github.com → Settings → Codespaces → Secrets → New secret**

| Secret               | Value                                  |
| -------------------- | -------------------------------------- |
| `DATABASE_URL`       | Your Neon production connection string |
| `JWT_ACCESS_SECRET`  | Your JWT access secret                 |
| `JWT_REFRESH_SECRET` | Your JWT refresh secret                |

These are injected as environment variables when the Codespace starts.
The `backend/.env` file still needs to be created manually (or via
`.devcontainer/setup.sh`) — these secrets just make the values available.

---

## Vercel

Go to: **vercel.com → your project → Settings → Environment Variables**

| Variable       | Value                                 | Environment |
| -------------- | ------------------------------------- | ----------- |
| `VITE_API_URL` | `https://shiftwise-0sin.onrender.com` | Production  |

Vercel auto-deploys on every push to `main` via its GitHub integration.
The frontend root directory is set to `frontend` during initial project creation.

---

## Render

Go to: **render.com → your backend service → Settings → Environment Variables**

| Variable             | Value                              |
| -------------------- | ---------------------------------- |
| `DATABASE_URL`       | Neon production connection string  |
| `JWT_ACCESS_SECRET`  | 64-char hex string                 |
| `JWT_REFRESH_SECRET` | 64-char hex string                 |
| `FRONTEND_URL`       | `https://shiftwise-app.vercel.app` |
| `NODE_ENV`           | `production`                       |
| `PORT`               | `3001`                             |

### Auto-deploy

Render auto-deploy should be **disabled** — deploys are triggered exclusively
via the GitHub Actions deploy hook to keep CI/CD as the single source of truth.

Go to: **Settings → Auto-Deploy** → set to **No**

### Deploy hook

Go to: **Settings → Deploy Hook** → copy the URL → add as
`RENDER_DEPLOY_HOOK_BACKEND` in GitHub repository secrets.
