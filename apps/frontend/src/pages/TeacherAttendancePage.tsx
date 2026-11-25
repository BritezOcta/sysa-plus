import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  teacherApi,
  type AttendanceStudentRow,
  type CommissionAttendanceResponse,
  type TeacherCommissionSummary,
} from "../api/teacher.api";
import { APP_ROUTES } from "../constants";
import styles from "./TeacherAttendancePage.module.css";

type AttendanceStatus = "PRESENTE" | "AUSENTE" | "JUSTIFICADO";

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function getProjectedStats(
  student: AttendanceStudentRow,
  status: AttendanceStatus | "",
) {
  const totalClasses = student.previousTotalClasses + (status ? 1 : 0);
  const attended =
    student.previousAttendedClasses +
    (status === "PRESENTE" || status === "JUSTIFICADO" ? 1 : 0);

  if (totalClasses === 0) {
    return { percentage: 100, condition: "REGULAR" as const };
  }

  const percentage = Math.round((attended / totalClasses) * 100);
  if (percentage < 75) return { percentage, condition: "LIBRE" as const };
  if (percentage < 80) return { percentage, condition: "EN_RIESGO" as const };
  return { percentage, condition: "REGULAR" as const };
}

export default function TeacherAttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [commissions, setCommissions] = useState<TeacherCommissionSummary[]>(
    [],
  );
  const [selectedCommissionId, setSelectedCommissionId] = useState(
    searchParams.get("comision") ?? "",
  );
  const [selectedDate, setSelectedDate] = useState(getTodayIso());
  const [topic, setTopic] = useState("");

  const [attendanceData, setAttendanceData] =
    useState<CommissionAttendanceResponse | null>(null);
  const [statuses, setStatuses] = useState<
    Record<string, AttendanceStatus | "">
  >({});
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  const [isLoadingCommissions, setIsLoadingCommissions] = useState(true);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadCommissions() {
      setIsLoadingCommissions(true);
      setError(null);
      try {
        const list = await teacherApi.getCommissions();
        setCommissions(list);

        if (list.length > 0) {
          const fromUrl = searchParams.get("comision");
          const validId = list.some((c) => c.id === fromUrl)
            ? fromUrl!
            : list[0].id;
          setSelectedCommissionId(validId);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar tus comisiones.",
        );
      } finally {
        setIsLoadingCommissions(false);
      }
    }

    void loadCommissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAttendance(commissionId: string, date: string) {
    if (!commissionId || !date) return;
    setIsLoadingAttendance(true);
    setError(null);
    setSuccessMessage(null);
    setConfirmOverwrite(false);

    try {
      const data = await teacherApi.getAttendance(commissionId, date);
      setAttendanceData(data);
      setTopic(data.existingSession?.topic ?? "");

      const initialStatuses: Record<string, AttendanceStatus | ""> = {};
      for (const student of data.students) {
        initialStatuses[student.enrollmentId] = student.currentStatus;
      }
      setStatuses(initialStatuses);
    } catch (err) {
      setAttendanceData(null);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar la asistencia de la comisión.",
      );
    } finally {
      setIsLoadingAttendance(false);
    }
  }

  useEffect(() => {
    if (selectedCommissionId && selectedDate) {
      void loadAttendance(selectedCommissionId, selectedDate);
    }
  }, [selectedCommissionId, selectedDate]);

  function handleCommissionChange(newId: string) {
    setSelectedCommissionId(newId);
    setSearchParams({ comision: newId });
  }

  function handleStatusChange(enrollmentId: string, status: AttendanceStatus) {
    setStatuses((prev) => ({ ...prev, [enrollmentId]: status }));
    setSuccessMessage(null);
    setError(null);
  }

  function handleMarkAllPresent() {
    if (!attendanceData) return;
    const next: Record<string, AttendanceStatus> = {};
    for (const student of attendanceData.students) {
      next[student.enrollmentId] = "PRESENTE";
    }
    setStatuses(next);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!attendanceData) return;

    setError(null);
    setSuccessMessage(null);

    const students = attendanceData.students;
    const missing = students.some((s) => !statuses[s.enrollmentId]);
    if (missing) {
      setError(
        "Registro incompleto: debés marcar el estado de todos los alumnos.",
      );
      return;
    }

    if (attendanceData.existingSession && !confirmOverwrite) {
      setError(
        "Ya existe una asistencia cargada para esta fecha. Marcá la casilla de confirmación para sobrescribirla.",
      );
      return;
    }

    setIsSaving(true);
    try {
      const res = await teacherApi.saveAttendance(selectedCommissionId, {
        date: selectedDate,
        topic: topic.trim() || undefined,
        allowOverwrite: Boolean(
          attendanceData.existingSession && confirmOverwrite,
        ),
        records: students.map((s) => ({
          enrollmentId: s.enrollmentId,
          status: statuses[s.enrollmentId] as AttendanceStatus,
        })),
      });

      setSuccessMessage(
        `Asistencia del ${res.date} guardada correctamente (${res.updatedStudents} alumnos actualizados).`,
      );
      await loadAttendance(selectedCommissionId, selectedDate);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar la asistencia.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const students = attendanceData?.students ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link to={APP_ROUTES.TEACHER_AREA} className={styles.backLink}>
            ← Volver al Panel Docente
          </Link>
          <h1 className={styles.title}>Registro y Consulta de Asistencias</h1>
        </div>
      </header>

      <section className={styles.controls}>
        <div className={styles.field}>
          <label htmlFor="commission-select">Materia y Comisión</label>
          <select
            id="commission-select"
            value={selectedCommissionId}
            onChange={(e) => handleCommissionChange(e.target.value)}
            disabled={isLoadingCommissions || commissions.length === 0}
            className={styles.select}
          >
            {commissions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.subjectName} — Com. {c.commissionCode}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="session-date">Fecha de clase</label>
          <input
            id="session-date"
            type="date"
            value={selectedDate}
            min={attendanceData?.commission.periodStart}
            max={attendanceData?.commission.periodEnd}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="session-topic">Tema de la clase (opcional)</label>
          <input
            id="session-topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ej: Derivadas y reglas de derivación"
            className={styles.input}
          />
        </div>
      </section>

      {attendanceData?.existingSession && (
        <div className={styles.warningBanner}>
          <span>
            Ya existe un registro de asistencia para el{" "}
            <strong>{selectedDate}</strong>. Podés editarlo confirmando la
            sobrescritura abajo.
          </span>
        </div>
      )}

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      {successMessage && (
        <div className={styles.successBanner} role="status">
          {successMessage}
        </div>
      )}

      <form onSubmit={(e) => void handleSave(e)} className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Alumnos inscriptos ({students.length})</h2>
          {students.length > 0 && (
            <button
              type="button"
              onClick={handleMarkAllPresent}
              className={styles.secondaryBtn}
            >
              Marcar todos presentes
            </button>
          )}
        </div>

        {isLoadingCommissions || isLoadingAttendance ? (
          <p className={styles.muted}>Cargando datos...</p>
        ) : students.length === 0 ? (
          <p className={styles.muted}>
            No hay alumnos inscriptos en esta comisión.
          </p>
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Legajo</th>
                  <th>Alumno</th>
                  <th>Estado</th>
                  <th>% Proyectado</th>
                  <th>Condición</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const current = statuses[student.enrollmentId] ?? "";
                  const stats = getProjectedStats(student, current);
                  return (
                    <tr key={student.enrollmentId}>
                      <td>{student.legajo}</td>
                      <td>{student.fullName}</td>
                      <td>
                        <div className={styles.statusGroup}>
                          {(
                            ["PRESENTE", "AUSENTE", "JUSTIFICADO"] as const
                          ).map((opt) => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() =>
                                handleStatusChange(student.enrollmentId, opt)
                              }
                              className={
                                current === opt
                                  ? styles.statusBtnActive
                                  : styles.statusBtn
                              }
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td>{stats.percentage}%</td>
                      <td>{stats.condition}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {attendanceData?.existingSession && (
              <label className={styles.overwriteCheck}>
                <input
                  type="checkbox"
                  checked={confirmOverwrite}
                  onChange={(e) => setConfirmOverwrite(e.target.checked)}
                />
                Confirmo que quiero sobrescribir la asistencia ya registrada
                para esta fecha.
              </label>
            )}

            <div className={styles.footerActions}>
              <button
                type="submit"
                disabled={isSaving}
                className={styles.saveBtn}
              >
                {isSaving ? "Guardando..." : "Guardar asistencia"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
