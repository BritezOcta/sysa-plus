import { PLAN, formatFecha, resumenAcademico } from "../../../data/mockStudentData";
import common from "../common.module.css";
import s from "./EstadoAcademicoPage.module.css";

const R = 52;
const C = 2 * Math.PI * R;

export function EstadoAcademicoPage() {
  const r = resumenAcademico();
  const aprobadas = PLAN.filter((m) => m.estado === "aprobada").sort((a, b) =>
    (b.fechaAprobacion ?? "").localeCompare(a.fechaAprobacion ?? ""),
  );
  const anios = [...new Set(PLAN.map((m) => m.anio))].sort((a, b) => a - b);

  return (
    <div className={common.page}>
      <header className={common.pageHeader}>
        <div>
          <h1 className={common.title}>Estado académico</h1>
          <p className={common.subtitle}>Tu avance en la carrera</p>
        </div>
      </header>

      <section className={s.top}>
        <div className={`${common.card} ${common.cardPad} ${s.ringCard}`}>
          <div className={s.ringWrap}>
            <svg viewBox="0 0 120 120" className={s.ring} role="img" aria-label={`${r.avance}% de avance`}>
              <circle cx="60" cy="60" r={R} className={s.ringBg} />
              <circle
                cx="60"
                cy="60"
                r={R}
                className={s.ringFg}
                strokeDasharray={`${(r.avance / 100) * C} ${C}`}
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div className={s.ringText}>
              <strong>{r.avance}%</strong>
              <span>avance</span>
            </div>
          </div>
          <dl className={s.facts}>
            <Fact label="Aprobadas" value={`${r.aprobadas} de ${r.total}`} />
            <Fact label="Promedio" value={r.promedio.toFixed(2)} />
            <Fact label="Regulares" value={String(r.regulares)} />
            <Fact label="Cursando" value={String(r.cursando)} />
          </dl>
        </div>

        <div className={`${common.card} ${common.cardPad}`}>
          <h2 className={common.cardTitle}>Avance por año</h2>
          <div className={s.bars}>
            {anios.map((a) => {
              const delAnio = PLAN.filter((m) => m.anio === a);
              const ok = delAnio.filter((m) => m.estado === "aprobada").length;
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

      <section className={common.card}>
        <div className={common.sectionHead}>
          <h2>Materias aprobadas</h2>
          <span className={common.muted}>{aprobadas.length} materias</span>
        </div>
        <div className={common.tableWrap}>
          <table className={common.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Materia</th>
                <th>Fecha</th>
                <th>Nota</th>
              </tr>
            </thead>
            <tbody>
              {aprobadas.map((m) => (
                <tr key={m.codigo}>
                  <td>
                    <span className={common.code}>{m.codigo}</span>
                  </td>
                  <td>
                    <strong>{m.nombre}</strong>
                  </td>
                  <td className={common.num}>
                    {m.fechaAprobacion ? formatFecha(m.fechaAprobacion) : "—"}
                  </td>
                  <td className={common.num}>
                    <strong>{m.nota}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
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
