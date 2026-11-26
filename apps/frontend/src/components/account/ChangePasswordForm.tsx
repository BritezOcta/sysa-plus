import { useState, type FormEvent } from "react";
import { authApi } from "../../api/auth.api";
import { ApiError } from "../../api/httpClient";
import common from "../../features/student/common.module.css";
import s from "./ChangePasswordForm.module.css";

const MIN_LENGTH = 8;
const NETWORK_ERROR_MESSAGE =
  "No se pudo conectar con el servidor. Verificá tu conexión e intentá nuevamente.";

type Feedback = { kind: "ok" | "error"; message: string } | null;

/** Cambio de contraseña del usuario logueado (cualquier rol). */
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setFeedback({ kind: "error", message: "Completá todos los campos." });
      return;
    }
    if (newPassword.length < MIN_LENGTH) {
      setFeedback({ kind: "error", message: `La nueva contraseña debe tener al menos ${MIN_LENGTH} caracteres.` });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ kind: "error", message: "La confirmación no coincide con la nueva contraseña." });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFeedback({ kind: "ok", message: "Tu contraseña se actualizó correctamente." });
    } catch (error) {
      setFeedback({
        kind: "error",
        message: error instanceof ApiError ? error.message : NETWORK_ERROR_MESSAGE,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={`${common.card} ${s.form}`} onSubmit={(e) => void handleSubmit(e)} noValidate>
      <label className={s.label}>
        Contraseña actual
        <input
          type="password"
          className={common.field}
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </label>
      <label className={s.label}>
        Nueva contraseña
        <input
          type="password"
          className={common.field}
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <span className={common.muted}>Mínimo {MIN_LENGTH} caracteres.</span>
      </label>
      <label className={s.label}>
        Repetir nueva contraseña
        <input
          type="password"
          className={common.field}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </label>

      {feedback && (
        <p role={feedback.kind === "error" ? "alert" : "status"} className={feedback.kind === "error" ? s.error : s.ok}>
          {feedback.message}
        </p>
      )}

      <div>
        <button type="submit" className={`${common.btn} ${common.btnPrimary}`} disabled={saving}>
          {saving ? "Guardando…" : "Cambiar contraseña"}
        </button>
      </div>
    </form>
  );
}
