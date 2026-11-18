// ============================================================
// DATOS DE EJEMPLO (mock). Reemplazar por llamadas a tu API
// Express + Prisma cuando estén listos los endpoints.
// ============================================================

export type EstadoMateria = "aprobada" | "regular" | "cursando" | "pendiente";

export interface Materia {
  codigo: string;
  nombre: string;
  anio: number;
  cuatrimestre: 1 | 2;
  horasSemana: number;
  estado: EstadoMateria;
  nota?: number;
  fechaAprobacion?: string; // ISO yyyy-mm-dd
  correlativas: string[];
}

export interface Estudiante {
  nombre: string;
  apellido: string;
  legajo: string;
  carrera: string;
  plan: string;
  iniciales: string;
}

export interface Aviso {
  id: string;
  titulo: string;
  cuerpo: string;
  fecha: string;
  tipo: "importante" | "info";
  leido: boolean;
}

export interface MesaExamen {
  id: string;
  codigo: string;
  fecha: string;
  hora: string;
  aula: string;
  llamado: string;
}

export const ESTUDIANTE: Estudiante = {
  nombre: "Lucía",
  apellido: "Fernández",
  legajo: "48215",
  carrera: "Ingeniería en Sistemas de Información",
  plan: "ISI-2023 (Ord. 1877)",
  iniciales: "LF",
};

export const PLAN: Materia[] = [
  { codigo: "ISI-101", nombre: "Análisis Matemático I", anio: 1, cuatrimestre: 1, horasSemana: 6, estado: "aprobada", nota: 8, fechaAprobacion: "2024-07-18", correlativas: [] },
  { codigo: "ISI-102", nombre: "Álgebra y Geometría Analítica", anio: 1, cuatrimestre: 1, horasSemana: 6, estado: "aprobada", nota: 7, fechaAprobacion: "2024-07-25", correlativas: [] },
  { codigo: "ISI-103", nombre: "Arquitectura de Computadoras", anio: 1, cuatrimestre: 1, horasSemana: 4, estado: "aprobada", nota: 9, fechaAprobacion: "2024-12-04", correlativas: [] },
  { codigo: "ISI-104", nombre: "Sistemas y Procesos de Negocio", anio: 1, cuatrimestre: 2, horasSemana: 6, estado: "aprobada", nota: 8, fechaAprobacion: "2024-12-11", correlativas: [] },
  { codigo: "ISI-105", nombre: "Lógica y Estructuras Discretas", anio: 1, cuatrimestre: 2, horasSemana: 6, estado: "regular", correlativas: [] },
  { codigo: "ISI-106", nombre: "Algoritmos y Estructuras de Datos", anio: 1, cuatrimestre: 2, horasSemana: 8, estado: "aprobada", nota: 7, fechaAprobacion: "2025-02-20", correlativas: [] },
  { codigo: "ISI-201", nombre: "Análisis Matemático II", anio: 2, cuatrimestre: 1, horasSemana: 6, estado: "cursando", correlativas: ["ISI-101", "ISI-102"] },
  { codigo: "ISI-202", nombre: "Sintaxis y Semántica de los Lenguajes", anio: 2, cuatrimestre: 1, horasSemana: 6, estado: "cursando", correlativas: ["ISI-105", "ISI-106"] },
  { codigo: "ISI-203", nombre: "Paradigmas de Programación", anio: 2, cuatrimestre: 1, horasSemana: 6, estado: "regular", correlativas: ["ISI-106"] },
  { codigo: "ISI-204", nombre: "Sistemas Operativos", anio: 2, cuatrimestre: 2, horasSemana: 6, estado: "pendiente", correlativas: ["ISI-103"] },
  { codigo: "ISI-205", nombre: "Análisis de Sistemas de Información", anio: 2, cuatrimestre: 2, horasSemana: 8, estado: "pendiente", correlativas: ["ISI-104"] },
  { codigo: "ISI-206", nombre: "Física II", anio: 2, cuatrimestre: 2, horasSemana: 6, estado: "pendiente", correlativas: ["ISI-101"] },
];

export const MESAS: MesaExamen[] = [
  { id: "m1", codigo: "ISI-105", fecha: "2026-12-02", hora: "09:00", aula: "Aula 304", llamado: "1° llamado" },
  { id: "m2", codigo: "ISI-105", fecha: "2026-12-16", hora: "14:00", aula: "Aula 210", llamado: "2° llamado" },
  { id: "m3", codigo: "ISI-203", fecha: "2026-12-09", hora: "18:30", aula: "Laboratorio 2", llamado: "1° llamado" },
  { id: "m4", codigo: "ISI-201", fecha: "2026-12-11", hora: "09:00", aula: "Aula 105", llamado: "1° llamado" },
  { id: "m5", codigo: "ISI-106", fecha: "2026-12-04", hora: "16:00", aula: "Aula 301", llamado: "1° llamado" },
];

export const AVISOS: Aviso[] = [
  { id: "a1", titulo: "Abierta la inscripción a mesas de diciembre", cuerpo: "Podés inscribirte a las mesas de examen hasta 48 horas antes de cada fecha.", fecha: "2026-11-16", tipo: "importante", leido: false },
  { id: "a2", titulo: "Relevamiento de datos censales 2026", cuerpo: "Completá tus datos antes del cierre del ciclo lectivo para poder inscribirte a cursar en 2027.", fecha: "2026-11-10", tipo: "importante", leido: false },
  { id: "a3", titulo: "Cierre de cursadas del 2º cuatrimestre", cuerpo: "Las notas de parciales recuperatorios se publican hasta el 27 de noviembre.", fecha: "2026-11-05", tipo: "info", leido: true },
];

export function getMateria(codigo: string): Materia | undefined {
  return PLAN.find((m) => m.codigo === codigo);
}

export function resumenAcademico(materias: Materia[] = PLAN) {
  const aprobadas = materias.filter((m) => m.estado === "aprobada");
  const notas = aprobadas.map((m) => m.nota ?? 0);
  const promedio = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
  return {
    total: materias.length,
    aprobadas: aprobadas.length,
    regulares: materias.filter((m) => m.estado === "regular").length,
    cursando: materias.filter((m) => m.estado === "cursando").length,
    pendientes: materias.filter((m) => m.estado === "pendiente").length,
    promedio,
    avance: materias.length ? Math.round((aprobadas.length / materias.length) * 100) : 0,
  };
}

export function formatFecha(iso: string, conDia = false): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("es-AR", {
    ...(conDia ? { weekday: "short" } : {}),
    day: "2-digit",
    month: "short",
    year: conDia ? undefined : "numeric",
  });
}
