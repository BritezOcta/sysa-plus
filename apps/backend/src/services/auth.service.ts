import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import { AppError } from "../lib/AppError.js";
import { signSessionToken } from "../lib/jwt.js";
import { createLoginIpLimiter } from "../lib/loginIpLimiter.js";
import { userRepository } from "../repositories/user.repository.js";
import { isRole, type AuthUser } from "../types/auth.js";
import { AUDIT_ACTIONS, auditService } from "./audit.service.js";

// Hash con el que se compara cuando el DNI no existe, para que la respuesta tarde
// lo mismo que con un DNI válido y no se pueda deducir qué usuarios existen.
const DUMMY_HASH = bcrypt.hashSync("sysaplus-dummy-password", 10);

const DNI_PATTERN = /^\d{7,8}$/;

export const AUTH_ERROR_CODES = {
  MISSING_FIELDS: "MISSING_FIELDS",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  ACCOUNT_INACTIVE: "ACCOUNT_INACTIVE",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  TOO_MANY_ATTEMPTS: "TOO_MANY_ATTEMPTS",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_CURRENT_PASSWORD: "INVALID_CURRENT_PASSWORD",
  INVALID_NEW_PASSWORD: "INVALID_NEW_PASSWORD",
} as const;

const PASSWORD_MIN_LENGTH = 8;
// bcrypt ignora lo que pase de 72 bytes.
const PASSWORD_MAX_LENGTH = 72;

const invalidCredentials = () =>
  new AppError(401, AUTH_ERROR_CODES.INVALID_CREDENTIALS, "Usuario o contraseña incorrectos");

const accountLocked = (lockedUntil: Date) =>
  new AppError(
    423,
    AUTH_ERROR_CODES.ACCOUNT_LOCKED,
    `Tu cuenta está bloqueada temporalmente tras ${env.LOGIN_MAX_ATTEMPTS} intentos fallidos. Intentá nuevamente en ${minutesUntil(lockedUntil)} minuto(s).`,
    { lockedUntil: lockedUntil.toISOString() },
  );

const loginIpLimiter = createLoginIpLimiter({
  maxFailures: env.LOGIN_IP_MAX_ATTEMPTS,
  blockMs: env.LOGIN_IP_BLOCK_MINUTES * 60_000,
});

// Solo cuentan los fallos de credenciales (401) y los intentos sobre una cuenta bloqueada (423).
const countsAsIpFailure = (err: unknown) =>
  err instanceof AppError && (err.statusCode === 401 || err.statusCode === 423);

function minutesUntil(date: Date): number {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 60_000));
}

type AuthUserRecord = NonNullable<Awaited<ReturnType<typeof userRepository.findForAuthById>>>;

function toAuthUser(record: AuthUserRecord): AuthUser {
  if (!isRole(record.role)) {
    throw new Error(`Usuario ${record.userId} con rol desconocido: ${record.role}`);
  }
  return {
    userId: record.userId,
    dni: record.dni,
    firstName: record.firstName,
    lastName: record.lastName,
    email: record.email,
    role: record.role,
    legajo: record.studentProfile?.legajo ?? null,
    mustChangePassword: record.mustChangePassword,
  };
}

export interface LoginInput {
  dni: unknown;
  password: unknown;
  rememberMe: unknown;
  ipAddress: string | null;
}

export interface LoginResult {
  user: AuthUser;
  token: string;
  /** null = cookie de sesión (se borra al cerrar el navegador) */
  maxAgeMs: number | null;
  expiresAt: Date;
}

export const authService = {
  async login(input: LoginInput): Promise<LoginResult> {
    const ip = input.ipAddress;
    const blockedMs = ip ? loginIpLimiter.blockedFor(ip) : 0;
    if (blockedMs > 0) {
      await auditService.record({
        userId: null,
        action: AUDIT_ACTIONS.LOGIN_LOCKED,
        entity: "USERS",
        details: "Intento de ingreso desde una IP bloqueada por intentos fallidos",
        ipAddress: ip,
      });
      throw new AppError(
        429,
        AUTH_ERROR_CODES.TOO_MANY_ATTEMPTS,
        `Demasiados intentos fallidos desde esta conexión. Intentá nuevamente en ${minutesUntil(new Date(Date.now() + blockedMs))} minuto(s).`,
      );
    }

    try {
      const result = await authService.checkCredentials(input);
      if (ip) loginIpLimiter.reset(ip);
      return result;
    } catch (err) {
      if (ip && countsAsIpFailure(err)) loginIpLimiter.registerFailure(ip);
      throw err;
    }
  },

  /** Valida credenciales y abre la sesión, sin el límite por IP. Usar login(). */
  async checkCredentials({ dni, password, rememberMe, ipAddress }: LoginInput): Promise<LoginResult> {
    const dniValue = typeof dni === "string" ? dni.trim() : "";
    const passwordValue = typeof password === "string" ? password : "";

    if (!dniValue || !passwordValue) {
      throw new AppError(400, AUTH_ERROR_CODES.MISSING_FIELDS, "Completá el usuario y la contraseña para continuar");
    }

    // Un DNI con formato inválido no puede existir: misma respuesta genérica.
    const record = DNI_PATTERN.test(dniValue) ? await userRepository.findForAuthByDni(dniValue) : null;

    if (!record) {
      await bcrypt.compare(passwordValue, DUMMY_HASH);
      await auditService.record({
        userId: null,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        entity: "USERS",
        details: `DNI inexistente: ${dniValue.slice(0, 20)}`,
        ipAddress,
      });
      throw invalidCredentials();
    }

    const now = new Date();
    if (record.lockedUntil && record.lockedUntil > now) {
      await auditService.record({
        userId: record.userId,
        action: AUDIT_ACTIONS.LOGIN_LOCKED,
        entity: "USERS",
        entityId: String(record.userId),
        details: "Intento de ingreso con la cuenta bloqueada",
        ipAddress,
      });
      throw accountLocked(record.lockedUntil);
    }

    const passwordOk = await bcrypt.compare(passwordValue, record.passwordHash);

    if (!passwordOk) {
      const attempts = await userRepository.incrementFailedAttempts(record.userId);

      if (attempts >= env.LOGIN_MAX_ATTEMPTS) {
        const lockedUntil = new Date(now.getTime() + env.LOGIN_LOCK_MINUTES * 60_000);
        await userRepository.lockUntil(record.userId, lockedUntil);
        await auditService.record({
          userId: record.userId,
          action: AUDIT_ACTIONS.LOGIN_LOCKED,
          entity: "USERS",
          entityId: String(record.userId),
          details: `Cuenta bloqueada hasta ${lockedUntil.toISOString()} tras ${attempts} intentos fallidos`,
          ipAddress,
        });
        throw accountLocked(lockedUntil);
      }

      await auditService.record({
        userId: record.userId,
        action: AUDIT_ACTIONS.LOGIN_FAILED,
        entity: "USERS",
        entityId: String(record.userId),
        details: `Contraseña incorrecta (intento ${attempts} de ${env.LOGIN_MAX_ATTEMPTS})`,
        ipAddress,
      });
      throw invalidCredentials();
    }

    // La cuenta inactiva se informa solo con credenciales correctas, para no revelar datos.
    if (!record.isActive) {
      await auditService.record({
        userId: record.userId,
        action: AUDIT_ACTIONS.LOGIN_INACTIVE,
        entity: "USERS",
        entityId: String(record.userId),
        details: "Intento de ingreso con la cuenta inactiva",
        ipAddress,
      });
      throw new AppError(
        403,
        AUTH_ERROR_CODES.ACCOUNT_INACTIVE,
        "Su cuenta se encuentra inactiva. Comuníquese con la Dirección",
      );
    }

    const user = toAuthUser(record);
    const remember = rememberMe === true;
    const lifetimeMs = remember
      ? env.REMEMBER_ME_DAYS * 24 * 60 * 60_000
      : env.SESSION_HOURS * 60 * 60_000;

    const token = signSessionToken(user.userId, user.role, lifetimeMs / 1000);

    await userRepository.registerSuccessfulLogin(user.userId, now);
    await auditService.record({
      userId: user.userId,
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      entity: "USERS",
      entityId: String(user.userId),
      details: remember ? "Inicio de sesión (Recordarme)" : "Inicio de sesión",
      ipAddress,
    });

    return {
      user,
      token,
      maxAgeMs: remember ? lifetimeMs : null,
      expiresAt: new Date(now.getTime() + lifetimeMs),
    };
  },

  /**
   * Recupera al usuario de una sesión válida. Devuelve null si ya no existe o fue
   * dado de baja (RF-10): así una baja corta la sesión en el siguiente request.
   */
  async getActiveUser(userId: number): Promise<AuthUser | null> {
    const record = await userRepository.findForAuthById(userId);
    if (!record || !record.isActive) return null;
    return toAuthUser(record);
  },

  async changePassword({
    userId,
    currentPassword,
    newPassword,
    ipAddress,
  }: {
    userId: number;
    currentPassword: unknown;
    newPassword: unknown;
    ipAddress: string | null;
  }): Promise<void> {
    const current = typeof currentPassword === "string" ? currentPassword : "";
    const next = typeof newPassword === "string" ? newPassword : "";

    if (!current || !next) {
      throw new AppError(400, AUTH_ERROR_CODES.MISSING_FIELDS, "Completá la contraseña actual y la nueva");
    }
    if (next.length < PASSWORD_MIN_LENGTH || Buffer.byteLength(next, "utf8") > PASSWORD_MAX_LENGTH) {
      throw new AppError(
        400,
        AUTH_ERROR_CODES.INVALID_NEW_PASSWORD,
        `La nueva contraseña debe tener entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres`,
      );
    }

    const record = await userRepository.findForAuthById(userId);
    if (!record) throw new AppError(401, AUTH_ERROR_CODES.UNAUTHENTICATED, "Tu sesión no es válida o expiró. Iniciá sesión nuevamente");

    if (!(await bcrypt.compare(current, record.passwordHash))) {
      throw new AppError(400, AUTH_ERROR_CODES.INVALID_CURRENT_PASSWORD, "La contraseña actual es incorrecta");
    }
    if (current === next) {
      throw new AppError(400, AUTH_ERROR_CODES.INVALID_NEW_PASSWORD, "La nueva contraseña debe ser distinta de la actual");
    }

    await userRepository.updatePasswordHash(userId, await bcrypt.hash(next, 10));
    await auditService.record({
      userId,
      action: AUDIT_ACTIONS.PASSWORD_CHANGED,
      entity: "USERS",
      entityId: String(userId),
      details: "Cambio de contraseña",
      ipAddress,
    });
  },

  async logout(user: AuthUser | undefined, ipAddress: string | null): Promise<void> {
    if (!user) return;
    await auditService.record({
      userId: user.userId,
      action: AUDIT_ACTIONS.LOGOUT,
      entity: "USERS",
      entityId: String(user.userId),
      details: "Cierre de sesión",
      ipAddress,
    });
  },
};
