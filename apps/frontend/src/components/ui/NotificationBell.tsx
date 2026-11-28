import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import {
  notificationsApi,
  type NotificationItem,
} from "../../api/notifications.api";
import NoticeDetailModal from "../notices/NoticeDetailModal";
import { getNoticeDestination } from "../notices/noticeDestination";

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selected, setSelected] = useState<NotificationItem | null>(null);

  async function load() {
    try {
      const data = await notificationsApi.getMyNotifications();
      setItems(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Silencioso en la campanita
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleClickItem(item: NotificationItem) {
    if (!item.leido) {
      await notificationsApi.markAsRead(item.id);
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, leido: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    const destination = getNoticeDestination(item);
    if (destination) navigate(destination);
    else setSelected(item);
  }

  async function handleMarkAll() {
    await notificationsApi.markAllAsRead();
    setItems((prev) => prev.map((n) => ({ ...n, leido: true })));
    setUnreadCount(0);
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificaciones"
        style={{
          padding: "0.45rem 0.75rem",
          borderRadius: 6,
          border: "1px solid #cbd5e1",
          cursor: "pointer",
          position: "relative",
        }}
      >
        🔔 Avisos {unreadCount > 0 && <strong>({unreadCount})</strong>}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "110%",
            width: 320,
            maxHeight: 380,
            overflowY: "auto",
            background: "#fff",
            color: "#0f172a",
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 50,
            padding: "0.75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.5rem",
            }}
          >
            <strong>Notificaciones</strong>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void handleMarkAll()}
                style={{ fontSize: "0.8rem", cursor: "pointer" }}
              >
                Marcar todas leídas
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p style={{ fontSize: "0.9rem", margin: "0.5rem 0" }}>
              No tenés notificaciones por el momento.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {items.map((n) => (
                <li
                  key={n.id}
                  onClick={() => void handleClickItem(n)}
                  style={{
                    padding: "0.5rem",
                    borderBottom: "1px solid #e2e8f0",
                    cursor: "pointer",
                    background: n.leido ? "transparent" : "#f1f5f9",
                  }}
                >
                  <div style={{ fontWeight: n.leido ? 400 : 600 }}>
                    {n.tipo === "importante" ? "⚠️ " : ""}
                    {n.titulo}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#475569" }}>
                    {n.cuerpo}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Portal: la topbar tiene backdrop-filter y encerraría al modal (position: fixed).
          Se monta en #root para conservar el zoom de accesibilidad. */}
      {selected &&
        createPortal(
          <NoticeDetailModal notice={selected} onClose={() => setSelected(null)} />,
          document.getElementById("root") ?? document.body,
        )}
    </div>
  );
}
