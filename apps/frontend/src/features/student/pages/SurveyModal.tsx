import { useState, type FormEvent } from "react";
import { ApiError } from "../../../api/httpClient";
import { studentCoursesApi, type StudentCourse } from "../../../api/studentCourses.api";
import ModalShell from "../../../components/ui/ModalShell";
import modal from "../../../components/academic/Modals.module.css";
import s from "./CursadoPage.module.css";

const SCALE = [1, 2, 3, 4, 5];
const MAX_COMMENT = 1000;

interface Props {
  course: StudentCourse;
  questions: string[];
  onClose: () => void;
  /** Se llama cuando la encuesta quedó registrada (o ya lo estaba). */
  onAnswered: () => void;
}

/** Encuesta docente anónima de una cursada. */
export function SurveyModal({ course, questions, onClose, onAnswered }: Props) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const complete = answers.every((a) => a !== null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!complete || sending) return;
    setSending(true);
    setError(null);
    try {
      await studentCoursesApi.submitSurvey(course.enrollmentId, answers as number[], comment.trim() || null);
      onAnswered();
    } catch (err) {
      if (err instanceof ApiError && err.code === "SURVEY_ALREADY_ANSWERED") {
        onAnswered();
        return;
      }
      setError(err instanceof Error ? err.message : "No se pudo enviar la encuesta.");
      setSending(false);
    }
  }

  return (
    <ModalShell
      titleId="survey-title"
      title={`Encuesta docente · ${course.subjectName}`}
      subtitle="Tus respuestas son anónimas: el docente no puede saber quién respondió."
      closeAriaLabel="Cerrar encuesta"
      canClose={!sending}
      onRequestClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className={modal.formBody}>
          <p className={s.scaleHint}>1 = Muy en desacuerdo · 5 = Muy de acuerdo</p>
          {questions.map((q, qi) => (
            <fieldset key={q} className={s.question}>
              <legend>
                {qi + 1}. {q}
              </legend>
              <div className={s.scale}>
                {SCALE.map((v) => (
                  <label key={v} className={`${s.scaleOption} ${answers[qi] === v ? s.scaleSelected : ""}`}>
                    <input
                      type="radio"
                      name={`q${qi}`}
                      value={v}
                      checked={answers[qi] === v}
                      onChange={() => setAnswers((prev) => prev.map((a, i) => (i === qi ? v : a)))}
                    />
                    {v}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <label className={s.commentLabel} htmlFor="survey-comment">
            Comentario (opcional)
            <textarea
              id="survey-comment"
              rows={3}
              maxLength={MAX_COMMENT}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="¿Algo que quieras destacar o mejorar de la cursada?"
            />
            <span className={s.counter}>
              {comment.length}/{MAX_COMMENT}
            </span>
          </label>

          {error && (
            <div className={modal.errorBanner} role="alert">
              {error}
            </div>
          )}
        </div>

        <div className={modal.modalFooter}>
          <button type="button" className={modal.secondaryBtn} onClick={onClose} disabled={sending}>
            Cancelar
          </button>
          <button type="submit" className={modal.primaryBtn} disabled={!complete || sending}>
            {sending ? "Enviando…" : "Enviar encuesta"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
