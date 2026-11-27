import { useState, type FormEvent } from "react";
import { notificationsApi } from "../../../api/notifications.api";

interface BroadcastNoticeModalProps {
  onClose: () => void;
  onSuccess?: (sentCount: number) => void;
}

export default function BroadcastNoticeModal({
  onClose,
  onSuccess,
}: BroadcastNoticeModalProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<"info" | "importante">("info");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanBody = body.trim();

    if (!cleanTitle || !cleanBody) {
      setError("Completá el título y el mensaje del aviso.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await notificationsApi.broadcastToStudents({
        title: cleanTitle,
        body: cleanBody,
        type,
      });
      onSuccess?.(res.sentCount);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo enviar el aviso a los alumnos.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="broadcast-modal-title"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "grid",
        placeItems: "center",
        padding: "1rem",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#ffffff",
          color: "#0f172a",
          borderRadius: 10,
          padding: "1.5rem",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h2
            id="broadcast-modal-title"
            style={{ margin: 0, fontSize: "1.15rem" }}
          >
            Enviar aviso a alumnos
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.2rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          style={{ display: "grid", gap: "0.9rem" }}
        >
          <label
            style={{ display: "grid", gap: "0.35rem", fontSize: "0.9rem" }}
          >
            <span>Título</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Recordatorio de inscripción a finales"
              maxLength={120}
              required
              style={{
                padding: "0.55rem 0.7rem",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
              }}
            />
          </label>

          <label
            style={{ display: "grid", gap: "0.35rem", fontSize: "0.9rem" }}
          >
            <span>Tipo de aviso</span>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value === "importante" ? "importante" : "info")
              }
              style={{
                padding: "0.55rem 0.7rem",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
              }}
            >
              <option value="info">Informativo (info)</option>
              <option value="importante">Importante (importante)</option>
            </select>
          </label>

          <label
            style={{ display: "grid", gap: "0.35rem", fontSize: "0.9rem" }}
          >
            <span>Mensaje</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escribí el contenido del aviso para todos los alumnos..."
              rows={4}
              maxLength={1000}
              required
              style={{
                padding: "0.55rem 0.7rem",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                resize: "vertical",
              }}
            />
          </label>

          {error && (
            <p style={{ margin: 0, color: "#dc2626", fontSize: "0.85rem" }}>
              {error}
            </p>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.6rem",
              marginTop: "0.5rem",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "0.5rem 0.9rem",
                borderRadius: 6,
                border: "1px solid #cbd5e1",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: 6,
                border: "none",
                background: "#2563eb",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {submitting ? "Enviando..." : "Enviar aviso"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
