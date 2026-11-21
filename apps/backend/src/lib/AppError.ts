/**
 * Error de negocio con status HTTP y código estable que el frontend puede interpretar.
 * El errorHandler lo traduce a { status: "ERROR", code, message, ...details }.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}
