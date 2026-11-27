import type { Request, Response } from "express";
import { verifySessionToken } from "../lib/jwt.js";
import { clearSessionCookie, readSessionCookie, setSessionCookie } from "../lib/sessionCookie.js";
import { authService } from "../services/auth.service.js";

function clientIp(req: Request): string | null {
  return req.ip ?? null;
}

export const authController = {
  async login(req: Request, res: Response) {
    const body: Record<string, unknown> = req.body ?? {};
    const result = await authService.login({
      dni: body["dni"],
      password: body["password"],
      rememberMe: body["rememberMe"],
      ipAddress: clientIp(req),
    });

    setSessionCookie(res, result.token, result.maxAgeMs);
    res.status(200).json({
      status: "OK",
      user: result.user,
      expiresAt: result.expiresAt.toISOString(),
    });
  },

  async logout(req: Request, res: Response) {
    // Logout no exige sesión válida: siempre limpia la cookie.
    const token = readSessionCookie(req);
    const payload = token ? verifySessionToken(token) : null;
    const user = payload ? await authService.getActiveUser(payload.userId) : null;

    await authService.logout(user ?? undefined, clientIp(req));
    clearSessionCookie(res);
    res.status(200).json({ status: "OK" });
  },

  async changePassword(req: Request, res: Response) {
    const body: Record<string, unknown> = req.body ?? {};
    await authService.changePassword({
      userId: req.user!.userId,
      currentPassword: body["currentPassword"],
      newPassword: body["newPassword"],
      ipAddress: clientIp(req),
    });
    res.status(200).json({ status: "OK" });
  },

  me(req: Request, res: Response) {
    res.status(200).json({ status: "OK", user: req.user });
  },
};
