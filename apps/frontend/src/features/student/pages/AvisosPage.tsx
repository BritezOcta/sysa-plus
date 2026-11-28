import { useState } from "react";
import { useNavigate } from "react-router";
import { type NotificationItem } from "../../../api/notifications.api";
import { useStudentNotifications } from "../StudentNotificationsContext";
import NoticeCard from "../../../components/notices/NoticeCard";
import NoticeDetailModal from "../../../components/notices/NoticeDetailModal";
import { getNoticeDestination } from "../../../components/notices/noticeDestination";

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
  const [selected, setSelected] = useState<NotificationItem | null>(null);

  async function handleClickItem(item: NotificationItem) {
    if (!item.leido) await markAsRead(item.id);
    const destination = getNoticeDestination(item);
    if (destination) navigate(destination);
    else setSelected(item);
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
            <li key={item.id}>
              <NoticeCard
                titulo={item.titulo}
                cuerpo={item.cuerpo}
                tipo={item.tipo}
                fecha={item.fecha}
                leido={item.leido}
                truncate
                onClick={() => void handleClickItem(item)}
              />
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <NoticeDetailModal notice={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}
