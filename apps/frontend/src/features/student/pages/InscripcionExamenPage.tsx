import EnrollmentErrorModal from "../../../components/enrollment/EnrollmentError";
import ToastViewport from "../../../components/ui/ToastViewport";
import { classroomLabel, formatExamDate, teacherLabel, useExamEnrollment } from "../../../hooks/useExamEnrollment";
import type { ExamSession } from "../../../types";
import { formatFecha } from "../formatFecha";
import common from "../common.module.css";
import s from "./InscripcionExamenPage.module.css";

function windowText(session: ExamSession): string {
  const range = `del ${formatExamDate(session.enrollmentStartDate)} al ${formatExamDate(session.enrollmentEndDate)}`;
  return session.isOpen ? `Inscripción abierta ${range}` : `Inscripción cerrada (habilitada ${range})`;
}

/** Bloque de fecha de las tarjetas: día grande y mes abreviado. */
function DateBlock({ date }: { date: string }) {
  return (
    <div className={s.fecha}>
      <span className={s.dia}>{formatFecha(date).split(" ")[0]}</span>
      <span className={s.mes}>{formatFecha(date, true).split(" ").slice(-1)[0]}</span>
    </div>
  );
}

/** RF-06: inscripción a exámenes finales (/alumno/inscripcion-examen). */
export function InscripcionExamenPage() {
  const {
    overview,
    loadState,
    retryLoad,
    isSubmitting,
    modalState,
    dismissModal,
    toasts,
    dismissToast,
    handleRequestEnroll,
    handleRequestCancel,
  } = useExamEnrollment();

  if (!overview) {
    return (
      <div className={common.page}>
        <header className={common.pageHeader}>
          <h1 className={common.title}>Inscripción a examen</h1>
        </header>
        {loadState.status === "error" ? (
          <div className={`${common.card} ${common.empty}`} role="alert">
            <p>{loadState.message}</p>
            <button type="button" className={`${common.btn} ${common.btnPrimary}`} onClick={retryLoad}>
              Reintentar
            </button>
          </div>
        ) : (
          <div className={`${common.card} ${common.empty}`} role="status">
            Cargando mesas de examen…
          </div>
        )}
      </div>
    );
  }

  const { session, calls, enrollments } = overview;
  const enrolledCallIds = new Set(enrollments.map((e) => e.examCallId));

  return (
    <div className={common.page}>
      <header className={common.pageHeader}>
        <div>
          <h1 className={common.title}>Inscripción a examen</h1>
          <p className={common.subtitle}>
            {session ? `${session.name} · ${windowText(session)}` : "No hay turnos de examen con inscripción configurada"}
          </p>
        </div>
        <span className={`${common.chip} ${common.chipInfo}`}>
          {enrollments.length} {enrollments.length === 1 ? "inscripción" : "inscripciones"}
        </span>
      </header>

      {enrollments.length > 0 && (
        <section className={common.card}>
          <div className={common.sectionHead}>
            <h2>Mis inscripciones</h2>
            <span className={common.muted}>{enrollments.length} mesas</span>
          </div>
          <div className={`${s.list} ${common.cardPad}`}>
            {enrollments.map((e) => (
              <article key={e.examEnrollmentId} className={s.mesa}>
                <DateBlock date={e.date} />
                <div className={s.info}>
                  <div className={s.titulo}>
                    <span className={common.code}>{e.subjectCode}</span>
                    <strong>{e.subjectName}</strong>
                  </div>
                  <p className={s.meta}>
                    {formatFecha(e.date, true)} · {e.time} hs · {classroomLabel(e.classroom)} · Profesor:{" "}
                    {teacherLabel(e.teacher)}
                  </p>
                </div>
                <div className={s.accion}>
                  <span className={`${common.chip} ${common.chipOk}`}>Código {e.enrollmentCode}</span>
                  {e.canCancel && (
                    <button
                      type="button"
                      className={`${common.btn} ${common.btnGhost}`}
                      disabled={isSubmitting}
                      onClick={() => handleRequestCancel(e)}
                    >
                      Darme de baja
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {session && (
        <section className={s.list} aria-label="Mesas de examen">
          {calls.length === 0 && (
            <div className={`${common.card} ${common.empty}`}>No hay mesas de examen para tus materias en este turno.</div>
          )}
          {calls.map((call) => {
            const enrolled = enrolledCallIds.has(call.examCallId);
            return (
              <article
                key={call.examCallId}
                className={`${common.card} ${s.mesa} ${call.ineligibility ? s.off : ""}`}
              >
                <DateBlock date={call.date} />
                <div className={s.info}>
                  <div className={s.titulo}>
                    <span className={common.code}>{call.subjectCode}</span>
                    <strong>{call.subjectName}</strong>
                  </div>
                  <p className={s.meta}>
                    {formatFecha(call.date, true)} · {call.time} hs · {classroomLabel(call.classroom)} ·{" "}
                    {call.callNumber}° llamado · Profesor: {teacherLabel(call.teacher)}
                    {call.capacity !== null && ` · Cupo ${call.enrolledCount}/${call.capacity}`}
                  </p>
                </div>
                <div className={s.accion}>
                  {enrolled ? (
                    <span className={`${common.chip} ${common.chipOk}`}>Inscripto/a</span>
                  ) : call.ineligibility ? (
                    <span className={`${common.chip} ${common.chipMuted}`}>{call.ineligibility.message}</span>
                  ) : (
                    <button
                      type="button"
                      className={`${common.btn} ${common.btnPrimary}`}
                      disabled={isSubmitting || !session.isOpen}
                      onClick={() => handleRequestEnroll(call)}
                    >
                      Inscribirme
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {modalState && (
        <EnrollmentErrorModal
          title={modalState.title}
          message={modalState.message}
          isConfirmation={modalState.isConfirmation}
          confirmLabel={modalState.confirmLabel}
          cancelLabel={modalState.cancelLabel}
          busy={isSubmitting}
          onClose={dismissModal}
          onConfirm={modalState.onConfirm}
        />
      )}

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
