#!/bin/bash
set -e

echo "🔧 Setting up ShiftWise development environment..."

# ── 1. Start PostgreSQL ──────────────────────────────────────────────────────
echo "▶ Starting PostgreSQL..."
sudo service postgresql start

# Create database and user if they don't exist
sudo -u postgres psql -tc "SELECT 1 FROM pg_user WHERE usename = 'shiftwise'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER shiftwise WITH PASSWORD 'shiftwise' CREATEDB;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'shiftwise'" | grep -q 1 || \
  sudo -u postgres createdb -O shiftwise shiftwise

echo "✅ PostgreSQL ready — database: shiftwise / user: shiftwise / password: shiftwise"

# ── 2. Write backend .env if it doesn't exist ────────────────────────────────
if [ ! -f backend/.env ]; then
  echo "▶ Creating backend/.env..."

  # Generate JWT secrets
  ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
  REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

  cat > backend/.env << EOF
DATABASE_URL="postgresql://shiftwise:shiftwise@localhost:5432/shiftwise"
JWT_ACCESS_SECRET="${ACCESS_SECRET}"
JWT_REFRESH_SECRET="${REFRESH_SECRET}"
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
PORT=3001
EOF

  echo "✅ backend/.env created with generated JWT secrets"
else
  echo "✅ backend/.env already exists, skipping"
fi

# ── 3. Run Prisma migrations and seed ────────────────────────────────────────
echo "▶ Running database migrations..."
cd backend
npx prisma generate
npx prisma migrate dev --name init --skip-seed 2>/dev/null || npx prisma migrate deploy
echo "▶ Seeding database..."
npx tsx prisma/seed.ts
cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ShiftWise is ready!"
echo ""
echo "   Run the app:   npm run dev"
echo "   Frontend:      http://localhost:5173"
echo "   API:           http://localhost:3001"
echo "   Prisma Studio: cd backend && npm run db:studio"
echo ""
echo "   Demo login:    manager@demo.com / password123"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
