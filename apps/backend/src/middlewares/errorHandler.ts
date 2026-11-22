import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/AppError.js";

// Express 5 forwards rejected promises from async handlers here automatically.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: "ERROR",
      code: err.code,
      message: err.message,
      ...err.details,
    });
    return;
  }

  // JSON mal formado en el body
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ status: "ERROR", code: "INVALID_JSON", message: "El cuerpo de la solicitud no es válido" });
    return;
  }

  console.error(err);
  res.status(500).json({ status: "ERROR", code: "INTERNAL_ERROR", message: "Internal server error" });
}
