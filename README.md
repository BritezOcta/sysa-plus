# SysA+ · Sistema Académico UTN-FRGP

Sistema de gestión académica para la Facultad Regional General Pacheco (UTN). Monorepo con frontend en React + TypeScript (Vite), backend en Node.js + Express (Prisma ORM) y base de datos Microsoft SQL Server.

---

## 🚀 Despliegue Rápido con Docker

No necesitas instalar SQL Server ni Node en tu máquina host. Con Docker y Docker Compose puedes levantar la aplicación completa (Base de datos + Backend + Frontend) con un solo comando.

### 1. Iniciar los contenedores

```bash
docker compose up -d
```
*(o usando `pnpm docker:up`)*

Esto levantará automáticamente:
1. **`sqlserver`** (`mcr.microsoft.com/mssql/server:2022-latest`): Servidor Microsoft SQL Server con persistencia en volumen Docker y healthcheck configurado.
2. **`backend`**: API Express con Node.js 22, Prisma ORM 7, migración/sincronización automática de esquema y seed de datos iniciales.
3. **`frontend`**: Interfaz de usuario en React compilada y servida con Nginx, con reverse-proxy automático para `/api`.

### 2. Acceder a los servicios

- **Frontend (Aplicación Web):** [http://localhost:5173](http://localhost:5173) (o también en [http://localhost](http://localhost))
- **API Backend:** [http://localhost:3000](http://localhost:3000) (ej. [http://localhost:3000/api/health](http://localhost:3000/api/health))
- **Base de Datos SQL Server:** `localhost:1433`

---

## 👥 Cuentas de Prueba Pre-configuradas (Seed Inicial)

Al levantar el contenedor por primera vez, se ejecuta un script de seed automático que registra usuarios de prueba para cada rol:

| Rol | DNI (Usuario) | Contraseña | Destino post-login |
|---|---|---|---|
| **Administrador / Director** | `11111111` | `Admin123!` | `/oferta-academica` |
| **Profesor** | `22222222` | `Profesor123!` | `/profesor` |
| **Alumno** (Lucía Fernández) | `33333333` | `Alumno123!` | `/alumno` |

---

## 🗄️ Conexión directa a SQL Server desde el Host

Si deseas consultar las tablas directamente desde tu herramienta favorita (DBeaver, Azure Data Studio, SSMS, etc.):

- **Host / Servidor:** `localhost,1433`
- **Usuario:** `sa`
- **Contraseña:** `SysAPlus2026!Secure` *(o la definida en `.env`)*
- **Base de Datos:** `sysaplus`
- **Cifrado / Certificado:** Confiar en el certificado del servidor (`TrustServerCertificate=true`)

---

## 🛠️ Comandos útiles de Docker

```bash
# Ver estado de los contenedores
docker compose ps

# Ver logs en tiempo real de todos los servicios
docker compose logs -f

# Ver logs específicos del backend
docker compose logs -f backend

# Detener los contenedores (preserva datos de la BD)
docker compose down

# Reconstruir las imágenes si realizas cambios de código
docker compose up -d --build
```

---

## 💻 Desarrollo Local (Sin Docker para Backend/Frontend)

Si prefieres ejecutar el backend y frontend en tu máquina host y usar Docker únicamente para SQL Server:

1. Levanta solo el contenedor de base de datos:
   ```bash
   docker compose up -d sqlserver
   ```
2. Configura `apps/backend/.env` con la cadena de conexión local:
   ```env
   DATABASE_URL="sqlserver://localhost:1433;database=sysaplus;user=sa;password=SysAPlus2026!Secure;encrypt=true;trustServerCertificate=true;"
   JWT_SECRET="sysaplus_super_secret_jwt_key_2026!"
   PORT=3000
   ```
3. Instala dependencias y corre las aplicaciones:
   ```bash
   pnpm install
   pnpm --filter backend db:generate
   pnpm --filter backend db:push
   pnpm --filter backend db:seed
   pnpm dev:backend
   pnpm dev:frontend
   ```
