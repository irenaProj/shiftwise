# Deployment

## Overview

| Service | Platform | Trigger |
|---------|----------|---------|
| Frontend | Vercel | Auto on push to `main` |
| Backend | Render | GitHub Actions deploy hook on push to `main` |
| Database | Neon | Managed PostgreSQL — no deployment needed |

---

## Database (Neon)

1. Go to [neon.tech](https://neon.tech) → New project
2. Name it `shiftwise`, pick the closest region
3. Copy the connection string from **Dashboard → Connection string**:
   ```
   postgresql://[USER]:[PASSWORD]@[HOST]/[DBNAME]?sslmode=require
   ```

---

## Backend (Render)

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

> **Note:** The free tier spins down after 15 minutes of inactivity and wakes
> in ~30 seconds. Fine for a portfolio project.

---

## Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → **New Project → Import** from GitHub
2. Set **Root Directory** to `frontend`
3. Add environment variable:

   | Variable       | Value |
   | -------------- | ----- |
   | `VITE_API_URL` | Your Render URL e.g. `https://shiftwise-api.onrender.com` |

4. Click **Deploy**

Vercel redeploys automatically on every push to `main` via its GitHub
integration — no webhook needed.

---

## Update CORS after deploying frontend

Once you have your Vercel URL, update `FRONTEND_URL` in Render:

```
FRONTEND_URL=https://shiftwise-app.vercel.app
```

---

## CI/CD (GitHub Actions)

### Workflows

```
.github/workflows/
├── ci.yml        # Type checks + Jest tests on every push and PR
└── deploy.yml    # Triggers Render deploy hook on push to main
```

### CI workflow

Runs on every push and pull request — three jobs in order:

1. **Backend — type check & build** — `tsc` must pass
2. **Frontend — type check & build** — `vite build` must pass
3. **Backend — Jest tests** — all 18 tests must pass (runs after build)

### Deploy workflow

Runs on push to `main` only:
- Calls the Render deploy hook → triggers a backend redeploy
- Vercel handles the frontend automatically

### Required GitHub repository secrets

| Secret | Where to get it |
|--------|----------------|
| `RENDER_DEPLOY_HOOK_BACKEND` | Render → service → Settings → Deploy Hook |
| `DATABASE_URL` | Neon dashboard → Connection string |
| `JWT_ACCESS_SECRET` | Generate locally |
| `JWT_REFRESH_SECRET` | Generate locally |

### Viewing CI results

**GitHub Actions:** repo → **Actions** tab → click any run  
**Vercel:** vercel.com/dashboard → your project → **Deployments**  
**Render:** render.com/dashboard → your service → **Events**
