import { useNavigate } from "react-router";
import { type NotificationItem } from "../../../api/notifications.api";
import { useStudentNotifications } from "../StudentNotificationsContext";

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AvisosPage() {
  const navigate = useNavigate();
  const {
    notifications: items,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
  } = useStudentNotifications();

  async function handleClickItem(item: NotificationItem) {
    if (!item.leido) await markAsRead(item.id);
    if (item.link) navigate(item.link);
  }

  return (
    <section style={{ padding: "1.5rem", maxWidth: 820 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          gap: "1rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Avisos y notificaciones</h1>
          <p style={{ margin: "0.25rem 0 0", opacity: 0.75 }}>
            {unreadCount > 0
              ? `Tenés ${unreadCount} aviso${unreadCount === 1 ? "" : "s"} sin leer.`
              : "Estás al día con tus avisos."}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => void markAllAsRead()}
            style={{
              padding: "0.5rem 0.9rem",
              borderRadius: 6,
              border: "1px solid #cbd5e1",
              cursor: "pointer",
            }}
          >
            Marcar todos como leídos
          </button>
        )}
      </header>

      {loading && <p>Cargando avisos...</p>}
      {error && <p style={{ color: "#dc2626" }}>{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p style={{ opacity: 0.75 }}>No tenés notificaciones por el momento.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: "0.75rem",
          }}
        >
          {items.map((item) => (
            <li
              key={item.id}
              onClick={() => void handleClickItem(item)}
              style={{
                padding: "1rem",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                borderLeft: `4px solid ${
                  item.tipo === "importante" ? "#d97706" : "#2563eb"
                }`,
                background: item.leido
                  ? "transparent"
                  : "rgba(37, 99, 235, 0.06)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  gap: "1rem",
                }}
              >
                <strong style={{ fontWeight: item.leido ? 500 : 700 }}>
                  {item.tipo === "importante" ? "⚠️ " : ""}
                  {item.titulo}
                </strong>
                <small style={{ opacity: 0.7, whiteSpace: "nowrap" }}>
                  {formatDate(item.fecha)}
                </small>
              </div>
              <p style={{ margin: "0.4rem 0 0", opacity: 0.9 }}>
                {item.cuerpo}
              </p>
              {!item.leido && (
                <small style={{ color: "#2563eb", fontWeight: 600 }}>
                  Nuevo
                </small>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
