#!/bin/sh
set -e
cd /app/apps/backend

echo "Generando cliente Prisma..."
pnpm db:generate
echo "Aplicando migraciones..."
pnpm db:migrate

echo "Iniciando aplicación..."
if [ "$NODE_ENV" = "development" ]; then
  exec pnpm dev
else
  exec node dist/src/server.js
fi
