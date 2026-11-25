/**
 * Helpers de horarios de comisión. SQL Server guarda las horas como TIME y Prisma
 * las devuelve como Date del 1970-01-01 en UTC, así que se leen con getUTC*.
 */

const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

export interface ScheduleSlot {
  dayOfWeek: number;
  startTime: Date;
  endTime: Date;
}

export interface ScheduleSlotDto {
  /** 1 = Lunes ... 7 = Domingo */
  dayOfWeek: number;
  dayName: string;
  /** "HH:MM" */
  startTime: string;
  /** "HH:MM" */
  endTime: string;
}

export function dayName(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek - 1] ?? `Día ${dayOfWeek}`;
}

function minutesOfDay(time: Date): number {
  return time.getUTCHours() * 60 + time.getUTCMinutes();
}

function formatTime(time: Date): string {
  const hh = String(time.getUTCHours()).padStart(2, "0");
  const mm = String(time.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** "18:30" → Date apta para una columna TIME. */
export function timeFromString(value: string): Date {
  return new Date(`1970-01-01T${value}:00.000Z`);
}

function sortSlots<T extends ScheduleSlot>(slots: T[]): T[] {
  return [...slots].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || minutesOfDay(a.startTime) - minutesOfDay(b.startTime),
  );
}

export function toScheduleDtos(slots: ScheduleSlot[]): ScheduleSlotDto[] {
  return sortSlots(slots).map((slot) => ({
    dayOfWeek: slot.dayOfWeek,
    dayName: dayName(slot.dayOfWeek),
    startTime: formatTime(slot.startTime),
    endTime: formatTime(slot.endTime),
  }));
}

/** "Lunes 18:00 a 22:00 hs · Jueves 18:00 a 20:00 hs" */
export function formatScheduleText(slots: ScheduleSlot[]): string {
  if (slots.length === 0) return "Horario a confirmar";
  return sortSlots(slots)
    .map((slot) => `${dayName(slot.dayOfWeek)} ${formatTime(slot.startTime)} a ${formatTime(slot.endTime)} hs`)
    .join(" · ");
}

/** true si alguna franja de `a` se superpone con alguna de `b` (mismo día y horas que se pisan). */
export function schedulesOverlap(a: ScheduleSlot[], b: ScheduleSlot[]): boolean {
  return a.some((slotA) =>
    b.some(
      (slotB) =>
        slotA.dayOfWeek === slotB.dayOfWeek &&
        minutesOfDay(slotA.startTime) < minutesOfDay(slotB.endTime) &&
        minutesOfDay(slotB.startTime) < minutesOfDay(slotA.endTime),
    ),
  );
}
