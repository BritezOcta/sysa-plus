#!/bin/sh
set -e

echo "========================================="
echo "   Iniciando SysA+ Backend Container"
echo "========================================="

cd /app/apps/backend

# Generar cliente de Prisma por si las dudas
echo "Generando cliente Prisma..."
pnpm db:generate

# Sincronizar la estructura de tablas con SQL Server
echo "Sincronizando esquema con SQL Server..."
pnpm exec prisma db push --schema prisma/schema.prisma --accept-data-loss

# Poblar datos iniciales si no existen
echo "Verificando / ejecutando seed de base de datos..."
pnpm db:seed || echo "Aviso: Seed completado o datos ya presentes."

echo "Iniciando aplicación..."
if [ "$NODE_ENV" = "development" ]; then
  exec pnpm dev
else
  exec node dist/src/server.js
fi
