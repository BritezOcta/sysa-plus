/** yyyy-mm-dd → "18 jul 2024" (o "mié 18 jul" con conDia). */
export function formatFecha(iso: string, conDia = false): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("es-AR", {
    ...(conDia ? { weekday: "short" } : {}),
    day: "2-digit",
    month: "short",
    year: conDia ? undefined : "numeric",
  });
}
