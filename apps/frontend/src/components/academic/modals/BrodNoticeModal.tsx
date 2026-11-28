import { useRef, useState, type FormEvent } from "react";
import { notificationsApi } from "../../../api/notifications.api";
import NoticeCard from "../../notices/NoticeCard";
import ModalShell from "../../ui/ModalShell";
import modalStyles from "../Modals.module.css";
import s from "./BroadcastNoticeModal.module.css";

type NoticeType = "info" | "importante";

const TITLE_MAX = 120;
const BODY_MAX = 1000;

const TYPE_OPTIONS: { value: NoticeType; icon: string; label: string; hint: string }[] = [
  { value: "info", icon: "ℹ️", label: "Informativo", hint: "Novedades generales" },
  { value: "importante", icon: "⚠️", label: "Importante", hint: "Requiere atención del alumno" },
];

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
  const [type, setType] = useState<NoticeType>("info");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewDate] = useState(() => new Date().toISOString());
  const titleRef = useRef<HTMLInputElement>(null);

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

  const isEmpty = !title.trim() && !body.trim();

  return (
    <ModalShell
      titleId="broadcast-modal-title"
      title="Enviar aviso a alumnos"
      subtitle="Llega a todos los alumnos activos del sistema."
      closeAriaLabel="Cerrar modal"
      tone={type === "importante" ? "warning" : "default"}
      wide
      canClose={!submitting}
      initialFocusRef={titleRef}
      onRequestClose={onClose}
    >
      <form className={modalStyles.formBody} onSubmit={(e) => void handleSubmit(e)}>
        <div className={s.layout}>
          <div className={s.formColumn}>
            <div role="radiogroup" aria-label="Tipo de aviso" className={s.typeGroup}>
              {TYPE_OPTIONS.map((opt) => {
                const checked = type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    className={`${s.typeOption} ${
                      opt.value === "importante" ? s.typeImportant : s.typeInfo
                    } ${checked ? s.typeChecked : ""}`}
                    onClick={() => setType(opt.value)}
                  >
                    <span className={s.typeIcon} aria-hidden="true">
                      {opt.icon}
                    </span>
                    <span className={s.typeLabel}>{opt.label}</span>
                    <span className={s.typeHint}>{opt.hint}</span>
                  </button>
                );
              })}
            </div>

            <div className={modalStyles.field}>
              <div className={s.labelRow}>
                <label htmlFor="broadcast-title">Título</label>
                <span className={s.counter}>
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
              <input
                ref={titleRef}
                id="broadcast-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Recordatorio de inscripción a finales"
                maxLength={TITLE_MAX}
                required
              />
            </div>

            <div className={modalStyles.field}>
              <div className={s.labelRow}>
                <label htmlFor="broadcast-body">Mensaje</label>
                <span className={s.counter}>
                  {body.length}/{BODY_MAX}
                </span>
              </div>
              <textarea
                id="broadcast-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escribí el contenido del aviso para todos los alumnos..."
                rows={6}
                maxLength={BODY_MAX}
                required
                className={s.textarea}
              />
            </div>
          </div>

          <aside className={s.previewColumn} aria-label="Vista previa">
            <p className={s.previewHeading}>Así lo verá el alumno</p>
            <div className={isEmpty ? s.previewEmpty : undefined}>
              <NoticeCard
                titulo={title.trim() || "Título del aviso"}
                cuerpo={body.trim() || "El mensaje aparecerá acá a medida que lo escribas."}
                tipo={type}
                fecha={previewDate}
                leido={false}
                truncate
              />
            </div>
            <p className={s.previewHint}>
              Al hacer clic, el alumno lo ve completo en una ventana flotante.
            </p>
          </aside>
        </div>

        {error && (
          <p role="alert" className={modalStyles.errorBanner}>
            {error}
          </p>
        )}

        <div className={modalStyles.modalFooter}>
          <button
            type="button"
            className={modalStyles.secondaryBtn}
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button type="submit" className={modalStyles.primaryBtn} disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar a todos los alumnos"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
