import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { isRole, type Role, type SessionTokenPayload } from "../types/auth.js";

const ISSUER = "sysaplus-api";

export function signSessionToken(userId: number, role: Role, expiresInSeconds: number): string {
  const payload: SessionTokenPayload = { sub: String(userId), role };
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: "HS256",
    issuer: ISSUER,
    expiresIn: expiresInSeconds,
  });
}

/** Devuelve el payload si el token es válido y no expiró; null en cualquier otro caso. */
export function verifySessionToken(token: string): { userId: number; role: Role } | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"], issuer: ISSUER });
    if (typeof decoded === "string") return null;

    const userId = Number(decoded.sub);
    const role = decoded["role"];
    if (!Number.isInteger(userId) || typeof role !== "string" || !isRole(role)) return null;

    return { userId, role };
  } catch {
    return null;
  }
}
