import type { CookieOptions, Request, Response } from "express";
import { isProduction } from "../config/env.js";

export const SESSION_COOKIE_NAME = "sysaplus_session";

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/api",
};

/** maxAgeMs null = cookie de sesión (sin "Recordarme"). */
export function setSessionCookie(res: Response, token: string, maxAgeMs: number | null): void {
  res.cookie(SESSION_COOKIE_NAME, token, maxAgeMs === null ? baseOptions : { ...baseOptions, maxAge: maxAgeMs });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, baseOptions);
}

export function readSessionCookie(req: Request): string | null {
  const value: unknown = req.cookies?.[SESSION_COOKIE_NAME];
  return typeof value === "string" && value.length > 0 ? value : null;
}
