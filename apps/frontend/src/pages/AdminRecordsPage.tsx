import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import {
  adminRecordsApi,
  type ClosedRecords,
  type RecordKind,
} from "../api/adminRecords.api";
import { APP_ROUTES } from "../constants";

interface Row {
  kind: RecordKind;
  id: string;
  title: string;
  detail: string;
}

const EMPTY: ClosedRecords = { courses: [], assessments: [], examCalls: [] };

/** RF-07: el Administrador/Director reabre actas cerradas indicando el motivo. */
export default function AdminRecordsPage() {
  const [records, setRecords] = useState<ClosedRecords>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reopening, setReopening] = useState<Row | null>(null);
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(
    () =>
      adminRecordsApi.listClosed().then(
        (data) => {
          setRecords(data);
          setIsLoading(false);
        },
        (err: unknown) => {
          setError(err instanceof Error ? err.message : "No se pudieron cargar las actas.");
          setIsLoading(false);
        },
      ),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function handleReopen(e: React.FormEvent) {
    e.preventDefault();
    if (!reopening) return;
    if (!reason.trim()) {
      setError("Indicá el motivo de la reapertura.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await adminRecordsApi.reopen(reopening.kind, reopening.id, reason.trim());
      setSuccess(`Se reabrió: ${reopening.title}.`);
      setReopening(null);
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reabrir el acta.");
    } finally {
      setIsSaving(false);
    }
  }

  const sections: { title: string; hint: string; rows: Row[] }[] = [
    {
      title: "Cursadas cerradas",
      hint: "Reabrir una cursada permite al profesor volver a cargar asistencia y evaluaciones. Las condiciones se recalculan cuando la vuelva a cerrar. Si también hay que corregir notas, después reabrí el acta de la evaluación.",
      rows: records.courses.map((c) => ({
        kind: "courses",
        id: c.id,
        title: `${c.subjectName} — Com. ${c.commission}`,
        detail: `${c.period} · cerrada el ${new Date(c.closedAt).toLocaleDateString("es-AR")}`,
      })),
    },
    {
      title: "Actas de evaluaciones cerradas",
      hint: "Solo se listan las de cursadas abiertas.",
      rows: records.assessments.map((a) => ({
        kind: "assessments",
        id: a.id,
        title: `${a.name} (${a.type}) — ${a.subjectName}`,
        detail: `Com. ${a.commission} · ${a.period}`,
      })),
    },
    {
      title: "Actas de finales cerradas",
      hint: "Reabrir la mesa permite al profesor corregir las notas del final.",
      rows: records.examCalls.map((c) => ({
        kind: "exam-calls",
        id: c.id,
        title: `${c.subjectName} — ${c.sessionName}`,
        detail: `Fecha ${c.callDate}`,
      })),
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <Link to={APP_ROUTES.ACADEMIC_OFFER}>← Volver a Gestión Académica</Link>
        <h1>Reapertura de actas</h1>
      </header>

      {error && (
        <div role="alert" style={{ color: "#b91c1c", marginBottom: "1rem" }}>
          {error}
        </div>
      )}
      {success && (
        <div role="status" style={{ color: "#166534", marginBottom: "1rem" }}>
          {success}
        </div>
      )}

      {reopening && (
        <form
          onSubmit={(e) => void handleReopen(e)}
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 10,
            padding: "1rem",
            marginBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <strong>Reabrir: {reopening.title}</strong>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            Motivo (queda registrado en la auditoría)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={3}
              required
            />
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Reabriendo..." : "Confirmar reapertura"}
            </button>
            <button
              type="button"
              onClick={() => {
                setReopening(null);
                setReason("");
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p>Cargando actas...</p>
      ) : (
        sections.map((section) => (
          <section key={section.title} style={{ marginBottom: "2rem" }}>
            <h2>{section.title}</h2>
            <p style={{ color: "#64748b", fontSize: "0.9rem" }}>{section.hint}</p>
            {section.rows.length === 0 ? (
              <p style={{ color: "#64748b" }}>No hay actas cerradas.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {section.rows.map((row) => (
                    <tr key={`${row.kind}-${row.id}`} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "0.6rem 0" }}>
                        <div>{row.title}</div>
                        <small style={{ color: "#64748b" }}>{row.detail}</small>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setReopening(row);
                            setReason("");
                            setError(null);
                            setSuccess(null);
                          }}
                        >
                          Reabrir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ))
      )}
    </div>
  );
}
