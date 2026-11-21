import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/AppError.js";
import { verifySessionToken } from "../lib/jwt.js";
import { clearSessionCookie, readSessionCookie } from "../lib/sessionCookie.js";
import { AUTH_ERROR_CODES, authService } from "../services/auth.service.js";
import type { Role } from "../types/auth.js";

const unauthenticated = () =>
  new AppError(401, AUTH_ERROR_CODES.UNAUTHENTICATED, "Tu sesión no es válida o expiró. Iniciá sesión nuevamente");

/** Exige una sesión válida y de un usuario activo; deja el usuario en req.user. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = readSessionCookie(req);
  const payload = token ? verifySessionToken(token) : null;

  if (!payload) {
    if (token) clearSessionCookie(res);
    throw unauthenticated();
  }

  const user = await authService.getActiveUser(payload.userId);
  if (!user) {
    clearSessionCookie(res);
    throw unauthenticated();
  }

  req.user = user;
  next();
}

/** Usar después de requireAuth: limita la ruta a los roles indicados. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(403, AUTH_ERROR_CODES.FORBIDDEN, "No tenés permisos para acceder a esta funcionalidad");
    }
    next();
  };
}
