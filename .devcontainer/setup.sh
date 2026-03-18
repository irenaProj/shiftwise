#!/bin/bash
set -e

echo "🔧 Setting up ShiftWise development environment..."

# Write backend .env if it doesn't exist
if [ ! -f backend/.env ]; then
  ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
  REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

  cat > backend/.env << ENVEOF
DATABASE_URL="paste-your-neon-connection-string-here"
JWT_ACCESS_SECRET="${ACCESS_SECRET}"
JWT_REFRESH_SECRET="${REFRESH_SECRET}"
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"
PORT=3001
ENVEOF
  echo "✅ backend/.env created — remember to add your Neon DATABASE_URL"
else
  echo "✅ backend/.env already exists, skipping"
fi

# Run migrations and seed
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npx tsx prisma/seed.ts
cd ..

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ShiftWise is ready!"
echo "   Run the app:   npm run dev"
echo "   Login:         will.power@demo.com / password123"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"