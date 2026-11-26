import { useMemo, useState } from "react";
import { Icon } from "../../../components/Icon";
import { useAcademicStatus } from "../../../hooks/useAcademicStatus";
import type { AcademicStatus, StatusMissingRequirement, SubjectStatusRow } from "../../../types/academicStatus.types";
import { AcademicStatusFallback } from "../AcademicStatusFallback";
import { formatFecha } from "../formatFecha";
import { StatusChip } from "../StatusChip";
import common from "../common.module.css";
import s from "./EstadoAcademicoPage.module.css";

const R = 52;
const C = 2 * Math.PI * R;

const HISTORY_RESULT_CLASS: Record<string, string> = {
  APROBADO: common.chipOk,
  APROBADA: common.chipOk,
  REGULAR: common.chipInfo,
  CURSANDO: common.chipWarn,
  LIBRE: common.chipDanger,
  DESAPROBADA: common.chipDanger,
  DESAPROBADO: common.chipDanger,
};

export function EstadoAcademicoPage() {
  const { state, retry } = useAcademicStatus();

  return (
    <div className={common.page}>
      <header className={common.pageHeader}>
        <div>
          <h1 className={common.title}>Estado académico</h1>
          <p className={common.subtitle}>
            {state.status === "ready"
              ? `${state.data.student.careerName} · ${state.data.student.studyPlan}`
              : "Tu avance en la carrera"}
          </p>
        </div>
      </header>

      {state.status === "ready" ? (
        <EstadoAcademicoContent data={state.data} />
      ) : (
        <AcademicStatusFallback state={state} onRetry={retry} />
      )}
    </div>
  );
}

function EstadoAcademicoContent({ data }: { data: AcademicStatus }) {
  const { summary, subjects, history } = data;
  const [texto, setTexto] = useState("");
  const [anio, setAnio] = useState("todos");
  const [cuatri, setCuatri] = useState("todos");

  const anios = [...new Set(subjects.map((m) => m.year).filter((y): y is number => y !== null))].sort((a, b) => a - b);

  // RF-09: filtro opcional por materia, año o cuatrimestre (sobre listados e historial; el resumen es siempre total).
  const matches = useMemo(() => {
    const q = texto.trim().toLowerCase();
    return (m: { subjectCode: string; subjectName: string; year: number | null; semester: number | null }) =>
      (anio === "todos" || m.year === Number(anio)) &&
      (cuatri === "todos" || m.semester === Number(cuatri)) &&
      (q === "" || `${m.subjectCode} ${m.subjectName}`.toLowerCase().includes(q));
  }, [texto, anio, cuatri]);

  const visibles = subjects.filter(matches);
  const habilitadasCursar = visibles.filter((m) => m.canEnroll);
  const habilitadasRendir = visibles.filter((m) => m.canTakeExam);
  const conFaltantes = visibles.filter((m) => m.missingToEnroll.length > 0 || m.missingForExam.length > 0);

  const subjectById = new Map(subjects.map((m) => [m.studyPlanSubjectId, m]));
  // Una materia que ya no está activa en el plan no tiene año/cuatrimestre: solo pasa sin esos filtros.
  const historial = history.filter((h) => {
    const m = subjectById.get(h.studyPlanSubjectId);
    return matches({ ...h, year: m?.year ?? null, semester: m?.semester ?? null });
  });

  return (
    <>
      <section className={s.top}>
        <div className={`${common.card} ${common.cardPad} ${s.ringCard}`}>
          <div className={s.ringWrap}>
            <svg viewBox="0 0 120 120" className={s.ring} role="img" aria-label={`${summary.progressPercent}% de avance`}>
              <circle cx="60" cy="60" r={R} className={s.ringBg} />
              <circle
                cx="60"
                cy="60"
                r={R}
                className={s.ringFg}
                strokeDasharray={`${(summary.progressPercent / 100) * C} ${C}`}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className={s.ringText}>
              <strong>{summary.progressPercent}%</strong>
              <span>avance</span>
            </div>
          </div>
          <dl className={s.facts}>
            <Fact label="Aprobadas" value={`${summary.approved} de ${summary.totalSubjects}`} />
            <Fact label="Promedio" value={summary.average === null ? "—" : summary.average.toFixed(2)} />
            <Fact label="Regulares" value={String(summary.regular)} />
            <Fact label="Cursando" value={String(summary.inProgress)} />
          </dl>
        </div>

        <div className={`${common.card} ${common.cardPad}`}>
          <h2 className={common.cardTitle}>Avance por año</h2>
          <div className={s.bars}>
            {anios.map((a) => {
              const delAnio = subjects.filter((m) => m.year === a);
              const ok = delAnio.filter((m) => m.status === "APROBADA").length;
              const pct = Math.round((ok / delAnio.length) * 100);
              return (
                <div key={a} className={s.barRow}>
                  <div className={s.barHead}>
                    <strong>{a}° año</strong>
                    <span className={common.muted}>
                      {ok} / {delAnio.length} materias
                    </span>
                  </div>
                  <div
                    className={s.track}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Avance de ${a}° año`}
                  >
                    <div className={s.fill} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className={common.toolbar}>
        <label className={common.search}>
          <Icon name="search" size={18} />
          <input
            className={common.field}
            type="search"
            placeholder="Filtrar por código o nombre de materia"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            aria-label="Filtrar por materia"
          />
        </label>
        <select className={common.field} value={anio} onChange={(e) => setAnio(e.target.value)} aria-label="Filtrar por año">
          <option value="todos">Todos los años</option>
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}° año
            </option>
          ))}
        </select>
        <select
          className={common.field}
          value={cuatri}
          onChange={(e) => setCuatri(e.target.value)}
          aria-label="Filtrar por cuatrimestre"
        >
          <option value="todos">Ambos cuatrimestres</option>
          <option value="1">1° cuatrimestre</option>
          <option value="2">2° cuatrimestre</option>
        </select>
      </div>

      <section className={s.top}>
        <SubjectList
          title="Habilitadas para cursar"
          empty="No tenés materias habilitadas para cursar con estos filtros."
          items={habilitadasCursar}
        />
        <SubjectList
          title="Habilitadas para rendir"
          empty="No tenés materias habilitadas para rendir con estos filtros."
          items={habilitadasRendir}
        />
      </section>

      <section className={common.card}>
        <div className={common.sectionHead}>
          <h2>Materias pendientes y requisitos faltantes</h2>
          <span className={common.muted}>{conFaltantes.length} materias</span>
        </div>
        {conFaltantes.length === 0 ? (
          <div className={common.empty}>No hay requisitos pendientes para las materias filtradas.</div>
        ) : (
          <div className={common.tableWrap}>
            <table className={common.table}>
              <thead>
                <tr>
                  <th>Materia</th>
                  <th>Estado</th>
                  <th>Falta para cursar</th>
                  <th>Falta para rendir</th>
                </tr>
              </thead>
              <tbody>
                {conFaltantes.map((m) => (
                  <tr key={m.studyPlanSubjectId}>
                    <td>
                      <span className={common.code}>{m.subjectCode}</span> <strong>{m.subjectName}</strong>
                    </td>
                    <td>
                      <StatusChip estado={m.status} />
                    </td>
                    <td>
                      <Requirements items={m.missingToEnroll} />
                    </td>
                    <td>
                      <Requirements items={m.missingForExam} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={common.card}>
        <div className={common.sectionHead}>
          <h2>Materias cursadas y rendidas</h2>
          <span className={common.muted}>{historial.length} registros</span>
        </div>
        {history.length === 0 ? (
          <div className={common.empty}>Todavía no tenés registros académicos.</div>
        ) : historial.length === 0 ? (
          <div className={common.empty}>No hay registros para los filtros elegidos.</div>
        ) : (
          <div className={common.tableWrap}>
            <table className={common.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Materia</th>
                  <th>Instancia</th>
                  <th>Condición</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h, i) => (
                  <tr key={`${h.kind}-${h.studyPlanSubjectId}-${h.date}-${i}`}>
                    <td className={common.num}>{formatFecha(h.date)}</td>
                    <td>
                      <span className={common.code}>{h.subjectCode}</span> <strong>{h.subjectName}</strong>
                    </td>
                    <td>
                      {h.kind === "FINAL" ? "Final" : "Cursada"}
                      <div className={common.muted}>{h.detail}</div>
                    </td>
                    <td>
                      <span className={`${common.chip} ${HISTORY_RESULT_CLASS[h.result] ?? common.chipMuted}`}>
                        {h.result.charAt(0) + h.result.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className={common.num}>
                      <strong>{h.grade ?? "—"}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function SubjectList({ title, empty, items }: { title: string; empty: string; items: SubjectStatusRow[] }) {
  return (
    <div className={common.card}>
      <div className={common.sectionHead}>
        <h2>{title}</h2>
        <span className={common.muted}>{items.length} materias</span>
      </div>
      {items.length === 0 ? (
        <div className={common.empty}>{empty}</div>
      ) : (
        <ul className={s.list}>
          {items.map((m) => (
            <li key={m.studyPlanSubjectId} className={s.listItem}>
              <span className={common.code}>{m.subjectCode}</span>
              <strong>{m.subjectName}</strong>
              {m.year !== null && (
                <span className={common.muted}>
                  {m.year}° año{m.semester ? ` · ${m.semester}° cuat.` : ""}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Requirements({ items }: { items: StatusMissingRequirement[] }) {
  if (items.length === 0) return <span className={common.muted}>—</span>;
  return (
    <ul className={s.reqs}>
      {items.map((r) => (
        <li key={`${r.studyPlanSubjectId}-${r.requiredCondition}`}>
          {r.subjectName} <span className={common.muted}>({r.requiredCondition === "APROBADA" ? "aprobada" : "regularizada"})</span>
        </li>
      ))}
    </ul>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.fact}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
