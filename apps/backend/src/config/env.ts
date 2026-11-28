import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer`);
  }
  return value;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT ?? 3000),
  // Procesos de Node que atienden la API (node:cluster). Cada uno tiene su propio pool de
  // conexiones (DB_POOL_MAX) y su pool de hilos para bcrypt (UV_THREADPOOL_SIZE).
  WEB_CONCURRENCY: positiveInt("WEB_CONCURRENCY", 1),
  DATABASE_URL: required("DATABASE_URL"),
  // Conexiones simultáneas a SQL Server (el driver usa 10 por defecto) y cuánto espera una
  // transacción por una conexión libre antes de fallar. Se midieron con loadtest/pico-inscripcion.js.
  DB_POOL_MAX: positiveInt("DB_POOL_MAX", 20),
  DB_TX_MAX_WAIT_MS: positiveInt("DB_TX_MAX_WAIT_MS", 10_000),

  // RF-01 · Autenticación
  JWT_SECRET: required("JWT_SECRET"),
  SESSION_HOURS: positiveInt("SESSION_HOURS", 8),
  REMEMBER_ME_DAYS: positiveInt("REMEMBER_ME_DAYS", 7),
  LOGIN_MAX_ATTEMPTS: positiveInt("LOGIN_MAX_ATTEMPTS", 5),
  LOGIN_LOCK_MINUTES: positiveInt("LOGIN_LOCK_MINUTES", 15),
  // Límite por IP, independiente del bloqueo de cuenta.
  LOGIN_IP_MAX_ATTEMPTS: positiveInt("LOGIN_IP_MAX_ATTEMPTS", 3),
  LOGIN_IP_BLOCK_MINUTES: positiveInt("LOGIN_IP_BLOCK_MINUTES", 15),

  // RF-11 · Certificados: URL pública del frontend a la que apunta el QR de validación.
  PUBLIC_APP_URL: (process.env.PUBLIC_APP_URL ?? "http://localhost:5173").replace(/\/+$/, ""),
} as const;

export const isProduction = env.NODE_ENV === "production";
