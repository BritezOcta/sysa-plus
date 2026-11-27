import { useCallback, useEffect, useState } from "react";
import { ApiError, NetworkError } from "../../../api/httpClient";
import {
  certificatesApi,
  saveBlob,
  type CertificateOptions,
  type CertificateType,
} from "../../../api/certificates.api";
import common from "../common.module.css";
import styles from "./CertificadosPage.module.css";

const GENERIC_ERROR = "No se pudo conectar con el servidor. Revisá tu conexión e intentá nuevamente.";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string; canRetry: boolean }
  | { status: "ready"; data: CertificateOptions };

/** Resultado de la última acción: éxito, error de negocio o error reintentable. */
type Feedback =
  | { kind: "success"; label: string; code: string }
  | { kind: "error"; message: string }
  | { kind: "retry"; message: string; retry: () => void }
  | null;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short", hourCycle: "h23" });
}

/** RF-11: el alumno genera y descarga certificados con código y QR de validación (/alumno/certificados). */
export function CertificadosPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [selected, setSelected] = useState<CertificateType | null>(null);
  const [periodId, setPeriodId] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const load = useCallback(() => {
    certificatesApi.getOptions().then(
      (data) => {
        setState({ status: "ready", data });
        setPeriodId((prev) => prev || data.defaultPeriodId);
        setSelected((prev) => prev ?? data.types.find((t) => t.available)?.type ?? null);
      },
      (err: unknown) => {
        if (err instanceof NetworkError) setState({ status: "error", message: GENERIC_ERROR, canRetry: true });
        else setState({ status: "error", message: err instanceof Error ? err.message : GENERIC_ERROR, canRetry: !(err instanceof ApiError) });
      },
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Descarga el PDF; si falla la generación o la conexión, ofrece reintentar la descarga. */
  const download = useCallback(
    async (code: string, label: string) => {
      setBusy(true);
      try {
        const { blob, fileName } = await certificatesApi.downloadPdf(code);
        saveBlob(blob, fileName);
        setFeedback({ kind: "success", label, code });
      } catch (err) {
        const message =
          err instanceof ApiError && err.code !== "PDF_GENERATION_ERROR"
            ? err.message
            : "Ocurrió un error al generar el archivo PDF del certificado.";
        setFeedback({ kind: "retry", message, retry: () => void download(code, label) });
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  async function handleGenerate() {
    if (!selected) return;
    setBusy(true);
    setFeedback(null);
    try {
      const issued = await certificatesApi.issue(selected, selected === "ALUMNO_REGULAR" ? periodId : undefined);
      load(); // actualiza el historial
      await download(issued.code, issued.label);
    } catch (err) {
      if (err instanceof ApiError) setFeedback({ kind: "error", message: err.message });
      else setFeedback({ kind: "retry", message: GENERIC_ERROR, retry: () => void handleGenerate() });
      setBusy(false);
    }
  }

  return (
    <div className={common.page}>
      <header className={common.pageHeader}>
        <div>
          <h1 className={common.title}>Certificados</h1>
          <p className={common.subtitle}>
            Generá certificados oficiales en PDF con código y QR de validación, sin trámite presencial.
          </p>
        </div>
      </header>

      {state.status === "loading" && (
        <div className={`${common.card} ${common.empty}`} role="status">Cargando…</div>
      )}

      {state.status === "error" && (
        <div className={`${common.card} ${common.empty}`} role="alert">
          <p>{state.message}</p>
          {state.canRetry && (
            <button type="button" className={`${common.btn} ${common.btnPrimary}`} onClick={() => { setState({ status: "loading" }); load(); }}>
              Reintentar
            </button>
          )}
        </div>
      )}

      {state.status === "ready" && (
        <>
          <section className={`${common.card} ${common.cardPad}`}>
            <h2 className={common.cardTitle}>Nuevo certificado</h2>

            <div className={styles.typeGrid} role="radiogroup" aria-label="Tipo de certificado">
              {state.data.types.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  role="radio"
                  aria-checked={selected === t.type}
                  disabled={!t.available || busy}
                  className={`${styles.typeCard} ${selected === t.type ? styles.typeSelected : ""}`}
                  onClick={() => setSelected(t.type)}
                >
                  <span className={styles.typeLabel}>{t.label}</span>
                  <span className={styles.typeDesc}>{t.description}</span>
                  {!t.available && <span className={`${common.chip} ${common.chipWarn}`}>{t.reason}</span>}
                </button>
              ))}
            </div>

            {selected === "ALUMNO_REGULAR" && (
              <label className={styles.periodField}>
                <span>Período a certificar</span>
                <select className={common.field} value={periodId} onChange={(e) => setPeriodId(e.target.value)} disabled={busy}>
                  {state.data.periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}{p.isCurrent ? " (actual)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={`${common.btn} ${common.btnPrimary}`}
                disabled={!selected || busy}
                onClick={() => void handleGenerate()}
              >
                {busy ? "Generando…" : "Generar y descargar PDF"}
              </button>
            </div>

            {feedback?.kind === "success" && (
              <div className={`${styles.feedback} ${styles.feedbackOk}`} role="status">
                <strong>{feedback.label} generado correctamente.</strong> Código de validación{" "}
                <span className={common.code}>{feedback.code}</span>. Cualquiera puede verificarlo escaneando el QR o en{" "}
                <a href={`/verificar/${feedback.code}`} target="_blank" rel="noreferrer">la página de verificación</a>.
              </div>
            )}
            {feedback?.kind === "error" && (
              <div className={`${styles.feedback} ${styles.feedbackError}`} role="alert">{feedback.message}</div>
            )}
            {feedback?.kind === "retry" && (
              <div className={`${styles.feedback} ${styles.feedbackError}`} role="alert">
                <span>{feedback.message}</span>
                <button type="button" className={`${common.btn} ${common.btnGhost}`} disabled={busy} onClick={feedback.retry}>
                  Reintentar
                </button>
              </div>
            )}
          </section>

          <section className={common.card}>
            <div className={common.sectionHead}>
              <h2>Certificados emitidos</h2>
              <span className={common.muted}>{state.data.history.length} en total</span>
            </div>
            {state.data.history.length === 0 ? (
              <div className={common.empty}>Todavía no generaste ningún certificado.</div>
            ) : (
              <div className={common.tableWrap}>
                <table className={common.table}>
                  <thead>
                    <tr>
                      <th>Emitido</th>
                      <th>Tipo</th>
                      <th>Período</th>
                      <th>Código</th>
                      <th aria-label="Acciones" />
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.history.map((c) => (
                      <tr key={c.code}>
                        <td className={common.num}>{formatDateTime(c.issuedAt)}</td>
                        <td>{c.label}</td>
                        <td>{c.period ?? "—"}</td>
                        <td><span className={common.code}>{c.code}</span></td>
                        <td>
                          <button
                            type="button"
                            className={`${common.btn} ${common.btnGhost}`}
                            disabled={busy}
                            onClick={() => { setFeedback(null); void download(c.code, c.label); }}
                          >
                            Descargar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
