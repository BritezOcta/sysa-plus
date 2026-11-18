import type { NextFunction, Request, Response } from "express";

// Express 5 forwards rejected promises from async handlers here automatically.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  res.status(500).json({ status: "ERROR", message: "Internal server error" });
}
