// ============================================================
// DATOS DE EJEMPLO (mock). Reemplazar por llamadas a tu API
// Express + Prisma cuando estén listos los endpoints.
// ============================================================

export interface Aviso {
  id: string;
  titulo: string;
  cuerpo: string;
  fecha: string;
  tipo: "importante" | "info";
  leido: boolean;
}

export const AVISOS: Aviso[] = [
  { id: "a1", titulo: "Abierta la inscripción a mesas de diciembre", cuerpo: "Podés inscribirte a las mesas de examen hasta 48 horas antes de cada fecha.", fecha: "2026-11-16", tipo: "importante", leido: false },
  { id: "a2", titulo: "Relevamiento de datos censales 2026", cuerpo: "Completá tus datos antes del cierre del ciclo lectivo para poder inscribirte a cursar en 2027.", fecha: "2026-11-10", tipo: "importante", leido: false },
  { id: "a3", titulo: "Cierre de cursadas del 2º cuatrimestre", cuerpo: "Las notas de parciales recuperatorios se publican hasta el 27 de noviembre.", fecha: "2026-11-05", tipo: "info", leido: true },
];

export { formatFecha } from "../features/student/formatFecha";
