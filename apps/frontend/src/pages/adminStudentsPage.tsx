import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  adminStudentsApi,
  type AdminCommissionSummary,
  type AdminStudentRow,
} from "../api/adminStudents.api";
import { APP_ROUTES } from "../constants";

export default function AdminStudentsPage() {
  const [commissions, setCommissions] = useState<AdminCommissionSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCommissions() {
      setIsLoading(true);
      setError(null);
      try {
        const list = await adminStudentsApi.getCommissions();
        setCommissions(list);
        if (list.length > 0) setSelectedId(list[0].id);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las comisiones.",
        );
      } finally {
        setIsLoading(false);
      }
    }
    void loadCommissions();
  }, []);

  useEffect(() => {
    if (!selectedId) return;

    async function loadStudents() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await adminStudentsApi.getCommissionStudents(selectedId);
        setStudents(data.students);
      } catch (err) {
        setStudents([]);
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el listado de alumnos.",
        );
      } finally {
        setIsLoading(false);
      }
    }
    void loadStudents();
  }, [selectedId]);

  const filteredStudents = students.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      s.fullName.toLowerCase().includes(q) || s.legajo.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <Link to={APP_ROUTES.ACADEMIC_OFFER}>← Volver a Gestión Académica</Link>
        <h1>Listado de Alumnos y Observaciones (Administrador)</h1>
      </header>

      {error && (
        <div role="alert" style={{ color: "#b91c1c", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <label
            htmlFor="admin-commission-select"
            style={{ display: "block", marginBottom: 4 }}
          >
            Comisión
          </label>
          <select
            id="admin-commission-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={commissions.length === 0}
            style={{ padding: "0.5rem", minWidth: 320 }}
          >
            {commissions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.subjectName} — Com. {c.commissionCode} ({c.period}) ·{" "}
                {c.enrolledCount} alumnos
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="admin-student-search"
            style={{ display: "block", marginBottom: 4 }}
          >
            Buscar alumno
          </label>
          <input
            id="admin-student-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Legajo o nombre..."
            style={{ padding: "0.5rem", minWidth: 240 }}
          />
        </div>
      </div>

      {isLoading ? (
        <p>Cargando alumnos...</p>
      ) : filteredStudents.length === 0 ? (
        <p>No hay alumnos para mostrar en esta comisión.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{ textAlign: "left", borderBottom: "1px solid #cbd5e1" }}
            >
              <th style={{ padding: "0.5rem" }}>Legajo</th>
              <th style={{ padding: "0.5rem" }}>Alumno</th>
              <th style={{ padding: "0.5rem" }}>Condición</th>
              <th style={{ padding: "0.5rem" }}>Asistencia</th>
              <th style={{ padding: "0.5rem" }}>Observaciones docentes</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => (
              <tr
                key={s.enrollmentId}
                style={{
                  borderBottom: "1px solid #e2e8f0",
                  verticalAlign: "top",
                }}
              >
                <td style={{ padding: "0.5rem" }}>{s.legajo}</td>
                <td style={{ padding: "0.5rem" }}>
                  <div>{s.fullName}</div>
                  <small style={{ opacity: 0.75 }}>{s.email}</small>
                </td>
                <td style={{ padding: "0.5rem" }}>
                  <strong>{s.enrollmentStatus}</strong>
                </td>
                <td style={{ padding: "0.5rem" }}>{s.attendancePercentage}%</td>
                <td style={{ padding: "0.5rem" }}>
                  {s.observations.length === 0 ? (
                    <span style={{ opacity: 0.6 }}>Sin observaciones</span>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                      {s.observations.map((obs) => (
                        <li key={obs.id} style={{ marginBottom: "0.35rem" }}>
                          <div>{obs.text}</div>
                          <small style={{ opacity: 0.75 }}>
                            {obs.teacherName} · {obs.createdAt.slice(0, 10)}
                          </small>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
