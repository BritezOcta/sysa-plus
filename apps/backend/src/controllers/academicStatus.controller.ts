import type { Request, Response } from "express";
import { academicStatusService } from "../services/academicStatus.service.js";

// requireAuth garantiza req.user en todas estas rutas.

export const academicStatusController = {
  async get(req: Request, res: Response) {
    const status = await academicStatusService.getStatus(req.user!);
    res.status(200).json({ status: "OK", ...status });
  },
};
