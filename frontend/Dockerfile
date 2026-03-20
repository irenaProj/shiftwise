# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY packages/dates/package.json ./packages/dates/

RUN npm ci

COPY frontend ./frontend
COPY packages ./packages

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN cd frontend && npm run build

# ── Stage 2: Production (nginx) ──────────────────────────────────────────────
FROM nginx:alpine AS production

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
