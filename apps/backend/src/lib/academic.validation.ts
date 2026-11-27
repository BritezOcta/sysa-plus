import { AppError } from "./AppError.js";

function invalid(message: string): never {
  throw new AppError(400, "VALIDATION_ERROR", message);
}

export function objectBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("El cuerpo de la solicitud debe ser un objeto");
  return value as Record<string, unknown>;
}

export function positiveId(value: unknown): number {
  if ((typeof value !== "string" && typeof value !== "number") || !/^\d+$/.test(String(value))) invalid("El identificador indicado no es válido");
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) invalid("El identificador indicado no es válido");
  return id;
}

function text(body: Record<string, unknown>, key: string, max: number, optional = false): string {
  const value = body[key];
  if (optional && value === undefined) return "";
  if (typeof value !== "string" || (!optional && !value.trim()) || value.trim().length > max) invalid(`El campo ${key} debe ser un texto ${optional ? "" : "no vacío "}de hasta ${max} caracteres`);
  return value.trim();
}

function integer(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) invalid(`${label} debe ser un entero entre ${min} y ${max}`);
  return value;
}

export function entityStatus(value: unknown): "active" | "inactive" {
  if (value !== "active" && value !== "inactive") invalid("El estado debe ser active o inactive");
  return value;
}

export function correlativityType(value: unknown): "regularizada_cursar" | "aprobada_cursar" | "aprobada_rendir" {
  if (value !== "regularizada_cursar" && value !== "aprobada_cursar" && value !== "aprobada_rendir") invalid("El tipo de correlatividad no es válido");
  return value;
}

export function subjectSlot(body: Record<string, unknown>): { year: number | null; period: 1 | 2 | "anual" | null } {
  const year = body.year === null ? null : integer(body.year, "El año", 1, 8);
  const period = body.period;
  if (period !== null && period !== 1 && period !== 2 && period !== "anual") invalid("El período debe ser 1, 2, anual o null");
  if ((year === null) !== (period === null)) invalid("Año y período deben estar asignados juntos");
  return { year, period };
}

/** PUT identifies the resource by URL. POST cannot update through body.id. */
function entityId(body: Record<string, unknown>, routeId?: unknown): { id?: string } {
  if (routeId === undefined) {
    if (body.id !== undefined) invalid("El alta no admite un identificador existente");
    return {};
  }
  const id = positiveId(routeId);
  if (body.id !== undefined && positiveId(body.id) !== id) invalid("El identificador del cuerpo no coincide con la URL");
  return { id: String(id) };
}

export function careerInput(value: unknown, routeId?: unknown) {
  const body = objectBody(value);
  return {
    ...entityId(body, routeId), code: text(body, "code", 20), name: text(body, "name", 150),
    studyPlan: text(body, "studyPlan", 100), durationYears: integer(body.durationYears, "La duración", 1, 8),
    status: entityStatus(body.status), description: text(body, "description", 500, true),
  };
}

export function subjectInput(value: unknown, routeId?: unknown) {
  const body = objectBody(value);
  if (!Array.isArray(body.requirements)) invalid("Las correlatividades deben ser una lista");
  const regularGrade = body.regularGrade === undefined ? 6 : body.regularGrade;
  const promotionGrade = body.promotionGrade === undefined || body.promotionGrade === "" ? null : body.promotionGrade;
  if (typeof regularGrade !== "number" || !Number.isFinite(regularGrade) || regularGrade < 1 || regularGrade > 10) invalid("La nota para regularizar debe estar entre 1 y 10");
  if (promotionGrade !== null && (typeof promotionGrade !== "number" || !Number.isFinite(promotionGrade) || promotionGrade < regularGrade || promotionGrade > 10)) invalid("La nota para promocionar debe estar entre la de regularización y 10");
  return {
    ...entityId(body, routeId), careerId: String(positiveId(body.careerId)),
    code: text(body, "code", 20), name: text(body, "name", 150),
    weeklyHours: integer(body.weeklyHours, "La carga semanal", 1, 2147483647),
    totalHours: integer(body.totalHours, "La carga total", 1, 2147483647),
    ...subjectSlot(body), status: entityStatus(body.status), regularGrade, promotionGrade,
    requirements: body.requirements.map(value => {
      const requirement = objectBody(value);
      return { requiresSubjectId: String(positiveId(requirement.requiresSubjectId)), type: correlativityType(requirement.type) };
    }),
  };
}
