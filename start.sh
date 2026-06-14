#!/bin/bash
# Run Daryger from the project root — not from ~/ or a backend/ folder
cd "$(dirname "$0")"

echo "→ Daryger project: $(pwd)"
echo "→ Installing dependencies..."
npm install

echo "→ Setting up database..."
npx prisma migrate deploy
npm run db:seed

echo "→ Starting dev server at http://localhost:3000"
echo "   Patient: patient@daryger.kz / demo123"
echo "   Doctor:  doctor@daryger.kz / demo123"
npm run dev
