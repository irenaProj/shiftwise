# GitHub Setup

Things that need to be configured directly on GitHub — these can't be committed
to the repo but are required for CI/CD, docs, and deployment to work correctly.

---

## Repository secrets

Go to: **GitHub repo → Settings → Secrets and variables → Actions → Repository secrets**

| Secret                       | Value                  | Used by                                    |
| ---------------------------- | ---------------------- | ------------------------------------------ |
| `RENDER_DEPLOY_HOOK_BACKEND` | Render deploy hook URL | `deploy.yml` — triggers backend redeploy   |
| `DATABASE_URL`               | Neon connection string | `ci.yml` — Jest tests (if E2E added later) |
| `JWT_ACCESS_SECRET`          | 64-char hex string     | `ci.yml` — backend test runner             |
| `JWT_REFRESH_SECRET`         | 64-char hex string     | `ci.yml` — backend test runner             |

### Getting each value

**`RENDER_DEPLOY_HOOK_BACKEND`**
Render dashboard → your backend service → **Settings** → scroll to **Deploy Hook** → copy URL

**`DATABASE_URL`**
Neon dashboard → your project → **Connection string** → copy URI format

**JWT secrets**
Generate fresh values:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## GitHub Pages

Required for TypeDoc API documentation to be published.

Go to: **GitHub repo → Settings → Pages**

| Setting | Value              |
| ------- | ------------------ |
| Source  | **GitHub Actions** |

Once set, the `docs.yml` workflow publishes to:

```
https://YOUR_USERNAME.github.io/shiftwise/
```

The docs are rebuilt and republished automatically on every push to `main`.

---

## Actions permissions

Go to: **GitHub repo → Settings → Actions → General**

| Setting              | Value                                        |
| -------------------- | -------------------------------------------- |
| Actions permissions  | **Allow all actions and reusable workflows** |
| Workflow permissions | **Read and write permissions**               |

The **Read and write permissions** setting is required for the `docs.yml`
workflow to publish to GitHub Pages.

---

## Branch protection (recommended)

Go to: **GitHub repo → Settings → Branches → Add branch ruleset**

Suggested rules for `main`:

| Rule                              | Value                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| Require status checks to pass     | ✅ — add `Backend — type check & build`, `Frontend — type check & build`, `Backend — Jest tests` |
| Require branches to be up to date | ✅                                                                                               |
| Block force pushes                | ✅                                                                                               |

This ensures no code reaches `main` without passing CI — the deploy workflow
only runs on `main`, so broken code never gets deployed.

---

## Codespaces

Go to: **GitHub repo → Settings → Codespaces**

| Setting                | Recommended value                       |
| ---------------------- | --------------------------------------- |
| Prebuild configuration | Optional — speeds up Codespace creation |
| Machine type           | 2-core (sufficient for this project)    |

### Codespace secrets

If you want the Codespace to connect to Neon automatically on startup without
manually editing `backend/.env`, add secrets at:

**github.com → Settings → Codespaces → Secrets → New secret**

| Secret               | Value                       |
| -------------------- | --------------------------- |
| `DATABASE_URL`       | Your Neon connection string |
| `JWT_ACCESS_SECRET`  | Your JWT access secret      |
| `JWT_REFRESH_SECRET` | Your JWT refresh secret     |

These are injected as environment variables when the Codespace starts and can
be referenced in `.devcontainer/setup.sh`.

---

## Vercel

Go to: **vercel.com → your project → Settings**

### Environment variables

| Variable       | Value                                 | Environment |
| -------------- | ------------------------------------- | ----------- |
| `VITE_API_URL` | `https://shiftwise-0sin.onrender.com` | Production  |

### Git integration

Vercel auto-deploys on every push to `main` — no additional setup needed.
The frontend root directory is set to `frontend` during initial project creation.

---

## Render

Go to: **render.com → your backend service → Settings**

### Environment variables

| Variable             | Value                              |
| -------------------- | ---------------------------------- |
| `DATABASE_URL`       | Neon connection string             |
| `JWT_ACCESS_SECRET`  | 64-char hex string                 |
| `JWT_REFRESH_SECRET` | 64-char hex string                 |
| `FRONTEND_URL`       | `https://shiftwise-app.vercel.app` |
| `NODE_ENV`           | `production`                       |
| `PORT`               | `3001`                             |

### Auto-deploy

Render auto-deploy should be **disabled** — deploys are triggered exclusively
via the GitHub Actions deploy hook to keep the CI/CD pipeline as the single
source of truth.

Go to: **Settings → Auto-Deploy** → set to **No**

## Addition to Repository secrets table

Add these two new secrets to the existing table in github-setup.md:

| Secret             | Value                                 | Used by                                         |
| ------------------ | ------------------------------------- | ----------------------------------------------- |
| `E2E_DATABASE_URL` | Neon testing branch connection string | `ci.yml` — Playwright resets test DB before E2E |

And add this new variable to the Repository variables table:

| Variable       | Value                              | Used by                                           |
| -------------- | ---------------------------------- | ------------------------------------------------- |
| `E2E_BASE_URL` | `https://shiftwise-app.vercel.app` | `ci.yml` — Playwright runs against this URL in CI |

## Addition to Neon section

### Testing branch

Create a dedicated branch for E2E test isolation:

1. Neon dashboard → your project → **Branches → Create branch**
2. Name: `testing`
3. Parent: `production`
4. Data: **Schema only** — seed script handles data
5. **Uncheck** auto-delete
6. Copy the connection string
7. Add as `E2E_DATABASE_URL` in GitHub repository secrets
8. Add to root `.env` locally

The testing branch is wiped and reseeded with known data before every
Playwright run — tests always start from a clean predictable state.
