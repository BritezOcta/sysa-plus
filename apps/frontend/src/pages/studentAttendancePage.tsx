import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  studentAttendanceApi,
  type StudentCourseAttendance,
} from "../api/studentAttendance.api";
import { APP_ROUTES } from "../constants";

export default function StudentAttendancePage() {
  const [courses, setCourses] = useState<StudentCourseAttendance[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const list = await studentAttendanceApi.getMyAttendance();
        setCourses(list);
        if (list.length > 0) setSelectedId(list[0].enrollmentId);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar tus asistencias.",
        );
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, []);

  const selectedCourse =
    courses.find((c) => c.enrollmentId === selectedId) ?? null;

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "1.5rem" }}>
      <header style={{ marginBottom: "1.5rem" }}>
        <Link to={APP_ROUTES.STUDENT_AREA}>← Volver al inicio</Link>
        <h1>Mis Asistencias</h1>
      </header>

      {error && (
        <div role="alert" style={{ color: "#b91c1c", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {isLoading ? (
        <p>Cargando asistencias...</p>
      ) : courses.length === 0 ? (
        <p>No tenés cursadas registradas para consultar asistencias.</p>
      ) : (
        <>
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="course-select"
              style={{ display: "block", marginBottom: "0.5rem" }}
            >
              Seleccioná una materia:
            </label>
            <select
              id="course-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              style={{ padding: "0.5rem", minWidth: 320 }}
            >
              {courses.map((c) => (
                <option key={c.enrollmentId} value={c.enrollmentId}>
                  {c.subjectName} — Com. {c.commission} ({c.period})
                </option>
              ))}
            </select>
          </div>

          {selectedCourse && (
            <section>
              <h2>
                {selectedCourse.subjectName} ({selectedCourse.subjectCode} ·
                Com. {selectedCourse.commission})
              </h2>
              <p>
                Asistencia:{" "}
                <strong>{selectedCourse.summary.attendancePercentage}%</strong>{" "}
                · Presentes:{" "}
                <strong>{selectedCourse.summary.presentCount}</strong> ·
                Ausentes: <strong>{selectedCourse.summary.absentCount}</strong>{" "}
                · Total clases:{" "}
                <strong>{selectedCourse.summary.totalClasses}</strong>
              </p>

              {selectedCourse.sessions.length === 0 ? (
                <p>Todavía no hay clases registradas en esta comisión.</p>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    marginTop: "1rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        textAlign: "left",
                        borderBottom: "1px solid #cbd5e1",
                      }}
                    >
                      <th style={{ padding: "0.5rem" }}>Fecha</th>
                      <th style={{ padding: "0.5rem" }}>Tema</th>
                      <th style={{ padding: "0.5rem" }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCourse.sessions.map((s) => (
                      <tr
                        key={s.sessionId}
                        style={{ borderBottom: "1px solid #e2e8f0" }}
                      >
                        <td style={{ padding: "0.5rem" }}>{s.date}</td>
                        <td style={{ padding: "0.5rem" }}>{s.topic ?? "—"}</td>
                        <td style={{ padding: "0.5rem" }}>
                          <strong>{s.status}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
