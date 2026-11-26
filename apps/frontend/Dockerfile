# Etapa 1: Build del Frontend con Vite
FROM node:22-alpine AS builder

WORKDIR /app

# Habilitar pnpm con la versión del proyecto
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

# Copiar configuración del workspace para cachear dependencias
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend/package.json apps/frontend/

# Instalar dependencias del frontend
RUN pnpm install --filter sysaplus... --frozen-lockfile

# Copiar archivos fuente del frontend
COPY apps/frontend apps/frontend

WORKDIR /app/apps/frontend

# Compilar la aplicación React para producción
RUN pnpm build

# Etapa 2: Servidor Web Nginx ligero
FROM nginx:alpine AS runner

# Copiar configuración de Nginx con soporte para SPA y proxy de /api
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos estáticos compilados
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
