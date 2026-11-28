import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { AppError } from "../lib/AppError.js";

/** Saturación de la base: no se consiguió conexión (P2024) o no se pudo iniciar la transacción a tiempo (P2028). */
const BUSY_CODES = new Set(["P2024", "P2028"]);

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

  if (err instanceof Prisma.PrismaClientKnownRequestError && BUSY_CODES.has(err.code)) {
    console.warn(`Base de datos saturada (${err.code}): ${err.message}`);
    res.status(503).json({
      status: "ERROR",
      code: "SERVICE_BUSY",
      message: "El sistema está con mucha demanda. Intentá nuevamente en unos segundos.",
    });
    return;
  }

  console.error(err);
  res.status(500).json({ status: "ERROR", code: "INTERNAL_ERROR", message: "Internal server error" });
}
