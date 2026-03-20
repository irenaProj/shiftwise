# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

# Prisma needs OpenSSL
RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY packages/dates/package.json ./packages/dates/

RUN npm ci

COPY backend/prisma ./backend/prisma
RUN cd backend && npx prisma generate

COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/

RUN cd backend && npm run build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:24-alpine AS production

# Prisma needs OpenSSL
RUN apk add --no-cache openssl

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY packages/dates/package.json ./packages/dates/

RUN npm ci --omit=dev

COPY backend/prisma ./backend/prisma
RUN cd backend && npx prisma generate

COPY --from=builder /app/backend/dist ./backend/dist

EXPOSE 3001

CMD ["node", "backend/dist/index.js"]
