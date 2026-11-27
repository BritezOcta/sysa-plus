import { useMemo, useState } from "react";
import { Icon } from "../../../components/Icon";
import { useAcademicStatus } from "../../../hooks/useAcademicStatus";
import type { AcademicStatus, StatusRequirement, SubjectStatusRow } from "../../../types/academicStatus.types";
import { AcademicStatusFallback } from "../AcademicStatusFallback";
import { getNavItem } from "../nav";
import { StatusChip } from "../StatusChip";
import common from "../common.module.css";
import s from "./CorrelatividadesPage.module.css";

export type CorrelativityMode = "cursar" | "rendir";

/** Cuadro completo de correlatividades del plan, con lo que el alumno ya cumple (✓) y lo que no (✗). */
export function CorrelatividadesPage({ mode }: { mode: CorrelativityMode }) {
  const { state, retry } = useAcademicStatus();

  return (
    <div className={common.page}>
      <PageHeader mode={mode} />
      {state.status === "ready" ? (
        <CorrelatividadesContent data={state.data} mode={mode} />
      ) : (
        <AcademicStatusFallback state={state} onRetry={retry} />
      )}
    </div>
  );
}

function PageHeader({ mode }: { mode: CorrelativityMode }) {
  const item = getNavItem(`correlatividad-${mode}`);
  return (
    <header className={common.pageHeader}>
      <div>
        <h1 className={common.title}>{item?.label ?? "Correlatividades"}</h1>
        {item && <p className={common.subtitle}>{item.description}</p>}
      </div>
    </header>
  );
}

const requirementsOf = (m: SubjectStatusRow, mode: CorrelativityMode) =>
  mode === "cursar" ? m.requirementsToEnroll : m.requirementsForExam;

const yearLabel = (year: number | null) => (year === null ? "Sin año asignado" : `${year}° año`);

function CorrelatividadesContent({ data, mode }: { data: AcademicStatus; mode: CorrelativityMode }) {
  const [texto, setTexto] = useState("");
  const [anio, setAnio] = useState("todos");

  const plan = data.subjects;
  const todosLosAnios = [...new Set(plan.map((m) => m.year))].sort((a, b) => (a ?? 99) - (b ?? 99));

  const filtradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return plan.filter(
      (m) =>
        (anio === "todos" || String(m.year) === anio) &&
        (q === "" || `${m.subjectCode} ${m.subjectName}`.toLowerCase().includes(q)),
    );
  }, [plan, texto, anio]);

  const anios = todosLosAnios.filter((a) => filtradas.some((m) => m.year === a));

  return (
    <>
      <div className={common.toolbar}>
        <label className={common.search}>
          <Icon name="search" size={18} />
          <input
            className={common.field}
            type="search"
            placeholder="Buscar por código o nombre"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            aria-label="Buscar materia"
          />
        </label>
        <select className={common.field} value={anio} onChange={(e) => setAnio(e.target.value)} aria-label="Filtrar por año">
          <option value="todos">Todos los años</option>
          {todosLosAnios.map((a) => (
            <option key={String(a)} value={String(a)}>
              {yearLabel(a)}
            </option>
          ))}
        </select>
      </div>

      {plan.length === 0 && (
        <div className={`${common.card} ${common.empty}`}>Tu plan de estudios todavía no tiene materias cargadas.</div>
      )}
      {plan.length > 0 && anios.length === 0 && (
        <div className={`${common.card} ${common.empty}`}>No hay materias que coincidan con los filtros.</div>
      )}

      {anios.map((a) => {
        const delAnio = filtradas.filter((m) => m.year === a);
        return (
          <section key={String(a)} className={common.card}>
            <div className={common.sectionHead}>
              <h2>{yearLabel(a)}</h2>
              <span className={common.muted}>{delAnio.length} materias</span>
            </div>
            <div className={common.tableWrap}>
              <table className={common.table}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Materia</th>
                    <th>{mode === "cursar" ? "Requisitos para cursar" : "Requisitos para rendir"}</th>
                    <th>Situación</th>
                  </tr>
                </thead>
                <tbody>
                  {delAnio.map((m) => (
                    <tr key={m.studyPlanSubjectId}>
                      <td>
                        <span className={common.code}>{m.subjectCode}</span>
                      </td>
                      <td>
                        <strong>{m.subjectName}</strong>
                      </td>
                      <td>
                        <Requirements items={requirementsOf(m, mode)} />
                      </td>
                      <td>
                        <Situation subject={m} mode={mode} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </>
  );
}

function Requirements({ items }: { items: StatusRequirement[] }) {
  if (items.length === 0) return <span className={common.muted}>Sin correlativas</span>;
  return (
    <ul className={s.reqs}>
      {items.map((r) => (
        <li key={`${r.studyPlanSubjectId}-${r.requiredCondition}`} className={s.req}>
          <span className={`${s.mark} ${r.met ? s.met : s.unmet}`} aria-hidden="true">
            {r.met ? "✓" : "✗"}
          </span>
          <span>
            {r.subjectName}{" "}
            <span className={common.muted}>({r.requiredCondition === "APROBADA" ? "Aprobada" : "Regular"})</span>
            <span className={s.srOnly}>{r.met ? ": cumplida" : ": pendiente"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Situation({ subject: m, mode }: { subject: SubjectStatusRow; mode: CorrelativityMode }) {
  const missing = requirementsOf(m, mode).filter((r) => !r.met).length;
  const faltan = (
    <span className={`${common.chip} ${common.chipWarn}`}>{missing === 1 ? "Te falta 1" : `Te faltan ${missing}`}</span>
  );
  const habilitada = <span className={`${common.chip} ${common.chipOk}`}>Habilitada</span>;

  if (mode === "cursar") {
    if (m.canEnroll) return habilitada;
    const canBeTaken = m.status === "PENDIENTE" || m.status === "LIBRE" || m.status === "DESAPROBADA";
    if (canBeTaken && missing > 0) return faltan;
    return <StatusChip estado={m.status} />;
  }

  if (m.canTakeExam) return habilitada;
  if (m.status === "REGULAR") {
    // Regular sin correlativas pendientes que igual no puede rendir: la regularidad venció.
    return missing > 0 ? faltan : <span className={`${common.chip} ${common.chipMuted}`}>Regularidad vencida</span>;
  }
  return <StatusChip estado={m.status} />;
}
