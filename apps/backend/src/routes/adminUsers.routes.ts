import { Router, type Request, type Response } from "express";
import { requireAuth, requireRole } from "../middlewares/requireAuth.js";
import { adminUsersService } from "../services/adminUsers.service.js";
import { ROLES } from "../types/auth.js";

/** Administrador/Director: usuarios y restablecimiento de contraseña. */
export const adminUsersRouter = Router();

adminUsersRouter.use(requireAuth, requireRole(ROLES.ADMINISTRADOR));

adminUsersRouter.get("/", async (req: Request, res: Response) => {
  const data = await adminUsersService.search(req.query["search"], req.query["role"], req.query["status"]);
  res.status(200).json({ status: "OK", ...data });
});

/** RF-10: dar de baja o reactivar a un alumno. */
adminUsersRouter.patch("/:userId/status", async (req: Request, res: Response) => {
  const result = await adminUsersService.setStudentStatus(req.params["userId"], req.body, {
    userId: req.user!.userId,
    ipAddress: req.ip ?? null,
  });
  res.status(200).json({ status: "OK", ...result });
});

adminUsersRouter.post("/:userId/reset-password", async (req: Request, res: Response) => {
  const result = await adminUsersService.resetPassword(req.params["userId"], {
    userId: req.user!.userId,
    ipAddress: req.ip ?? null,
  });
  res.status(200).json({ status: "OK", ...result });
});
