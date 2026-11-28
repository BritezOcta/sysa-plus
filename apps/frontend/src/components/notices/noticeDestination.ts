import type { NotificationItem } from "../../api/notifications.api";

/** Avisos guardados antes del cambio apuntaban a la propia página de avisos. */
const NO_PAGE_LINK = "/alumno/avisos";

/** Ruta a la que lleva el aviso, o null si no tiene página propia (se abre en ventana flotante). */
export function getNoticeDestination(
  item: Pick<NotificationItem, "link">,
): string | null {
  if (!item.link || item.link === NO_PAGE_LINK) return null;
  return item.link;
}
