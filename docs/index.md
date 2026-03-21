---
layout: home
title: ShiftWise Docs
---

# ShiftWise 🗓️

> AI-powered shift scheduler — full-stack portfolio project

**[Live demo](https://shiftwise-app.vercel.app)** |
**[API health](https://shiftwise-0sin.onrender.com/api/health)** |
**[GitHub](https://github.com/irenaProj/shiftwise)**

---

## Documentation

| Doc | Description |
| --- | ----------- |
| [Architecture](architecture.md) | System design, data model, monorepo structure |
| [API Reference](api.md) | Endpoints, auth, error codes |
| [Testing](testing.md) | Test strategy, running tests, CI |
| [Deployment](deployment.md) | Render, Vercel, Neon, GitHub Actions |
| [Docker](docker.md) | Local Docker setup, Codespaces notes |
| [Dates Package](dates-package.md) | @shiftwise/dates design and usage |
| [GitHub Setup](github-setup.md) | Secrets, Pages, branch protection |
| [API Docs](api/) | Generated TypeDoc from JSDoc comments |

---

## Quick start
```bash
git clone https://github.com/irenaProj/shiftwise.git
cd shiftwise
npm install
cd backend && cp .env.example .env  # fill in DATABASE_URL + JWT secrets
npm run db:migrate && npm run db:seed
cd .. && npm run dev
```

Login: `will.power@demo.com` / `password123`
