import type { AcademicStatusState } from "../../hooks/useAcademicStatus";
import common from "./common.module.css";

/** Estados de carga y error de RF-09 (error de conexión → opción de reintentar). */
export function AcademicStatusFallback({
  state,
  onRetry,
}: {
  state: Exclude<AcademicStatusState, { status: "ready" }>;
  onRetry: () => void;
}) {
  if (state.status === "loading") {
    return (
      <div className={`${common.card} ${common.empty}`} role="status">
        Cargando tu estado académico…
      </div>
    );
  }
  return (
    <div className={`${common.card} ${common.empty}`} role="alert">
      <p>{state.message}</p>
      <button type="button" className={`${common.btn} ${common.btnPrimary}`} onClick={onRetry}>
        Reintentar
      </button>
    </div>
  );
}
