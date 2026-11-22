import type { Request, Response } from "express";
import { healthService } from "../services/health.service.js";

export const healthController = {
  api(_req: Request, res: Response) {
    res.status(200).json({
      status: "OK",
      message: "SysA+ API funcionando correctamente",
    });
  },

  async database(_req: Request, res: Response) {
    const up = await healthService.isDatabaseUp();
    res.status(up ? 200 : 503).json({
      status: up ? "OK" : "ERROR",
      database: up ? "connected" : "disconnected",
    });
  },
};
