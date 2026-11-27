import { slot, type SeedCareer, type SeedOffering, type SeedSlot } from "./types.js";

/**
 * Tecnicatura Universitaria en Programación — Plan 2024 (Ord. 2018, correlatividades Ord. 2019).
 * Horarios: grillas 2º cuatrimestre 2026, turnos mañana (2CM…) y noche (2CN…).
 *
 * Las grillas de la TUP numeran módulos 1–4 sin indicar la hora. Se asumen módulos de 1 h:
 * mañana 08:00–12:00 y noche 18:30–22:30. Corregir desde el Administrador si difieren.
 */
const M = { full: ["08:00", "12:00"], first: ["08:00", "10:00"], second: ["10:00", "12:00"] } as const;
const N = { full: ["18:30", "22:30"], first: ["18:30", "20:30"], second: ["20:30", "22:30"] } as const;

type Day = Parameters<typeof slot>[0];
const m = (day: Day, part: keyof typeof M = "full"): SeedSlot => slot(day, M[part][0], M[part][1]);
const n = (day: Day, part: keyof typeof N = "full"): SeedSlot => slot(day, N[part][0], N[part][1]);

function offer(subject: string, commission: string, slots: SeedSlot[], teachers: string[]): SeedOffering {
  return { subject, commission, shift: commission[2] === "M" ? "M" : "N", semester: 2, slots, teachers };
}

export const TUP: SeedCareer = {
  code: "TUP-2024",
  name: "Tecnicatura Universitaria en Programación",
  studyPlan: "Plan 2024 (Ord. 2018)",
  durationYears: 2,
  description:
    "Desarrollo de software, bases de datos y metodologías de sistemas. 17 materias + Trabajo Final Integrador (1375 h).",
  subjectPrefix: "TUP",
  subjects: [
    { key: "1", name: "Programación I", year: 1, period: 1, weeklyHours: 8 },
    { key: "2", name: "Arquitectura y Sistemas Operativos", year: 1, period: 1, weeklyHours: 4 },
    { key: "3", name: "Matemática", year: 1, period: 1, weeklyHours: 4 },
    { key: "4", name: "Organización Empresarial", year: 1, period: 1, weeklyHours: 4 },
    { key: "5", name: "Programación II", year: 1, period: 2, weeklyHours: 8 },
    { key: "6", name: "Probabilidad y Estadística", year: 1, period: 2, weeklyHours: 4 },
    { key: "7", name: "Base de Datos I", year: 1, period: 2, weeklyHours: 4 },
    { key: "8", name: "Inglés I", year: 1, period: 2, weeklyHours: 4 },
    { key: "9", name: "Programación III", year: 2, period: 1, weeklyHours: 8 },
    { key: "10", name: "Base de Datos II", year: 2, period: 1, weeklyHours: 4 },
    { key: "11", name: "Metodología de Sistemas I", year: 2, period: 1, weeklyHours: 4 },
    { key: "12", name: "Inglés II", year: 2, period: 1, weeklyHours: 4 },
    { key: "13", name: "Programación IV", year: 2, period: 2, weeklyHours: 8 },
    { key: "14", name: "Metodología de Sistemas II", year: 2, period: 2, weeklyHours: 4 },
    { key: "15", name: "Introducción al Análisis de Datos", year: 2, period: 2, weeklyHours: 2 },
    { key: "16", name: "Legislación", year: 2, period: 2, weeklyHours: 2 },
    { key: "17", name: "Gestión de Desarrollo de Software", year: 2, period: 2, weeklyHours: 4 },
    { key: "18", name: "Trabajo Final Integrador", year: 2, period: 2, weeklyHours: 6, totalHours: 95 },
  ],
  correlativities: [
    { target: "5", regular: ["1", "2"] },
    { target: "6", regular: ["3"] },
    { target: "7", regular: ["1", "3"] },
    { target: "9", regular: ["5", "7"], approved: ["1"] },
    { target: "10", regular: ["7"], approved: ["1"] },
    { target: "11", regular: ["5", "7"], approved: ["1", "4"] },
    { target: "12", regular: ["8"] },
    { target: "13", regular: ["9", "10", "11"], approved: ["5", "7"] },
    { target: "14", regular: ["11"], approved: ["4"] },
    { target: "15", regular: ["10"], approved: ["6", "7"] },
    { target: "16", regular: ["7"], approved: ["4"] },
    { target: "17", regular: ["9", "10"], approved: ["5", "7"] },
    // Para iniciar el TFI: cursadas 8, 9, 10, 11 y 12 (para acreditarlo, todas aprobadas).
    { target: "18", regular: ["8", "9", "10", "11", "12"] },
  ],
  offerings: [
    // ---- Turno mañana ----
    offer("1", "2CM111", [m("LU"), m("VI")], ["Kloster", "Cornejo", "Fernández", "Pintos"]),
    offer("2", "2CM111", [m("MA")], ["Wenner", "Vastag"]),
    offer("4", "2CM111", [m("MI")], ["Godoy", "Bertello"]),
    offer("3", "2CM111", [m("JU")], ["Vastag", "Dirube", "Comerci"]),
    offer("4", "2CM121", [m("LU")], ["Cesare", "Cardone"]),
    offer("1", "2CM121", [m("MA"), m("JU")], ["Dirube", "Moran", "Faure", "Palermo"]),
    offer("2", "2CM121", [m("MI")], ["Vastag"]),
    offer("3", "2CM121", [m("VI")], ["Vastag", "Comerci"]),
    offer("3", "2CM131", [m("LU")], ["Vastag", "Comerci"]),
    offer("2", "2CM131", [m("MA")], ["Vastag"]),
    offer("1", "2CM131", [m("MI"), m("VI")], ["Rodriguez", "Gomez Nieto", "Kloster", "Dirube", "Carbonari"]),
    offer("4", "2CM131", [m("JU")], ["Lupani", "Bertello"]),
    offer("8", "2CM112", [m("LU")], ["Colui", "Nuñez"]),
    offer("7", "2CM112", [m("MA")], ["Palermo", "Cucurullo", "Sacomandi"]),
    offer("5", "2CM112", [m("MI"), m("JU")], ["Wenner", "Fernandez JM"]),
    offer("6", "2CM112", [m("VI")], ["Arguindegui", "Wenner", "Isla"]),
    offer("8", "2CM122", [m("LU")], ["Colui", "Montaño", "Da Silva"]),
    offer("5", "2CM122", [m("MA"), m("JU")], ["Kloster", "Carbonari"]),
    offer("6", "2CM122", [m("MI")], ["Arguindegui", "Isla"]),
    offer("7", "2CM122", [m("VI")], ["Palermo", "De Souza"]),
    offer("9", "2CM213", [m("LU"), m("VI")], ["Fernández", "Tapia", "T. Herrera"]),
    offer("10", "2CM213", [m("MA")], ["A. Herrera", "Español"]),
    offer("11", "2CM213", [m("MI")], ["Casanovas", "Palermo", "Cauda"]),
    offer("12", "2CM213", [m("JU")], ["Colui", "Nuñez", "Da Silva"]),
    offer("17", "2CM214", [m("LU")], ["Dirube", "Carbonari"]),
    offer("13", "2CM214", [m("MA"), m("JU")], ["Fernández", "T. Herrera", "Tapia"]),
    offer("16", "2CM214", [m("MI", "first")], ["Lupani", "Carbonari"]),
    offer("15", "2CM214", [m("MI", "second")], ["Pintos"]),
    offer("14", "2CM214", [m("VI")], ["Casanovas", "Palermo", "De Souza"]),
    // ---- Turno noche ----
    offer("2", "2CN111", [n("LU")], ["Natale", "Lavia"]),
    offer("1", "2CN111", [n("MA"), n("VI")], ["Simon", "Faure", "Lara Campos"]),
    offer("4", "2CN111", [n("MI")], ["Cesare", "Cardone"]),
    offer("3", "2CN111", [n("JU")], ["Lavia", "Natale"]),
    offer("4", "2CN121", [n("LU")], ["Lupani", "Bertello"]),
    offer("1", "2CN121", [n("MA"), n("MI")], ["Sar Fernandez", "Nieto", "Rodriguez"]),
    offer("2", "2CN121", [n("JU")], ["Natale", "Lavia"]),
    offer("3", "2CN121", [n("VI")], ["Lavia", "Natale"]),
    offer("5", "2CN112", [n("LU"), n("JU")], ["Wenner", "Fernandez JM", "Simon", "Varela"]),
    offer("6", "2CN112", [n("MA")], ["Arguindegui", "Wenner", "Isla"]),
    offer("7", "2CN112", [n("MI")], ["Palermo", "Sacomandi", "Cucurullo"]),
    offer("8", "2CN112", [n("VI")], ["Montaño", "Nuñez", "De Biase", "Colucci"]),
    offer("6", "2CN122", [n("LU")], ["Arguindegui", "Isla"]),
    offer("5", "2CN122", [n("MA"), n("JU")], ["Kloster", "Carbonari", "Lara Campos", "Suarez"]),
    offer("8", "2CN122", [n("MI")], ["Colucci", "Da Silva"]),
    offer("7", "2CN122", [n("VI")], ["Palermo", "De Souza", "Cauda"]),
    offer("10", "2CN213", [n("LU")], ["Simon", "Vélez"]),
    offer("12", "2CN213", [n("MA")], ["Colucci", "Montaño", "Lugo"]),
    offer("9", "2CN213", [n("MI"), n("VI")], ["Sar Fernandez", "Laurentino", "Larroca"]),
    offer("11", "2CN213", [n("JU")], ["Casanovas", "Palermo", "Cauda"]),
    offer("10", "2CN223", [n("LU")], ["Simon", "Vélez", "Lara Campos"]),
    offer("14", "2CN214", [n("LU")], ["Casanovas", "Palermo", "De Souza"]),
    offer("16", "2CN214", [n("MA", "first")], ["Lupani", "Carbonari"]),
    offer("15", "2CN214", [n("MA", "second")], ["Pintos"]),
    offer("17", "2CN214", [n("MI")], ["Dirube", "Carbonari"]),
    offer("13", "2CN214", [n("VI"), slot("SA", "08:00", "12:00")], ["T. Herrera", "C. Rodriguez"]),
  ],
  sources: [
    "https://www.frgp.utn.edu.ar/public/files/Plan_de_estudios-_PLAN_2024.pdf",
    "https://www.frgp.utn.edu.ar/public/files/ORDENANZA_2019_Correlatividades_TUP_PLAN_2024.pdf",
    "https://www.frgp.utn.edu.ar/public/files/Horarios_TUP_2026_Turno_Noche_2C_Modificado_12-8.pdf",
    "https://www.frgp.utn.edu.ar/public/files/Horarios_TUP_2026_Turno_Mañana_2C_Modificado_12-8.pdf",
  ],
};
