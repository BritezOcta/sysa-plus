FROM node:22-alpine AS base

# Dependencias del sistema necesarias para Prisma en Alpine Linux
RUN apk add --no-cache openssl libc6-compat sed

WORKDIR /app

# Habilitar pnpm con la versión del proyecto
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# Copiar archivos de configuración del workspace para cachear dependencias
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/

# Instalar dependencias del backend
RUN pnpm install --filter backend... --frozen-lockfile

# Copiar código fuente del backend
COPY apps/backend apps/backend

WORKDIR /app/apps/backend

# Generar cliente de Prisma para Linux (usando URL placeholder para build)
ENV DATABASE_URL="sqlserver://localhost:1433;database=sysaplus;user=sa;password=placeholder;trustServerCertificate=true"
RUN pnpm db:generate

# Compilar TypeScript a JavaScript
RUN pnpm build

# Limpiar posibles saltos de línea Windows CRLF del script de entrada
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
