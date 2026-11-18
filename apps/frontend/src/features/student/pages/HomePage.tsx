import { Link } from "react-router";
import { Icon } from "../../../components/Icon";
import {
  AVISOS,
  ESTUDIANTE,
  formatFecha,
  resumenAcademico,
} from "../../../data/mockStudentData";
import { getNavItem } from "../nav";
import common from "../common.module.css";
import s from "./HomePage.module.css";

const QUICK_IDS = [
  "plan",
  "estado",
  "inscripcion-examen",
  "inscripcion-cursado",
  "certificados",
  "correlatividad-cursar",
];

export function HomePage() {
  const r = resumenAcademico();
  const sinLeer = AVISOS.filter((a) => !a.leido).length;
  const quick = QUICK_IDS.map(getNavItem).filter((i): i is NonNullable<typeof i> => Boolean(i));

  return (
    <div className={common.page}>
      <section className={s.hero}>
        <div>
          <p className={s.heroKicker}>Autogestión alumno</p>
          <h1 className={s.heroTitle}>Hola, {ESTUDIANTE.nombre}</h1>
          <p className={s.heroText}>{ESTUDIANTE.carrera}</p>
          <div className={s.heroChips}>
            <span className={s.heroChip}>Plan {ESTUDIANTE.plan}</span>
            <span className={s.heroChip}>Legajo {ESTUDIANTE.legajo}</span>
          </div>
        </div>
        <div className={s.heroRight}>
          <span className={s.heroPct}>{r.avance}%</span>
          <span className={s.heroPctLabel}>de la carrera aprobada</span>
        </div>
      </section>

      <section className={s.stats} aria-label="Resumen académico">
        <Stat label="Materias aprobadas" value={`${r.aprobadas} / ${r.total}`} />
        <Stat label="Promedio" value={r.promedio.toFixed(2)} />
        <Stat label="Cursando ahora" value={String(r.cursando)} />
        <Stat label="Avisos sin leer" value={String(sinLeer)} highlight={sinLeer > 0} />
      </section>

      <section>
        <h2 className={s.sectionTitle}>Accesos rápidos</h2>
        <div className={s.quickGrid}>
          {quick.map((item) => (
            <Link key={item.id} to={item.to} className={s.quick}>
              <span className={s.quickIcon}>
                <Icon name={item.icon} size={22} />
              </span>
              <span className={s.quickText}>
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </span>
              <Icon name="chevronRight" size={18} className={s.quickArrow} />
            </Link>
          ))}
        </div>
      </section>

      <section className={common.card}>
        <div className={common.sectionHead}>
          <h2>Avisos recientes</h2>
          <Link to="/alumno/avisos" className={`${common.btn} ${common.btnGhost}`}>
            Ver todos
          </Link>
        </div>
        <ul className={s.avisos}>
          {AVISOS.map((a) => (
            <li key={a.id} className={s.aviso}>
              <span
                className={`${s.dot} ${a.leido ? s.dotRead : ""}`}
                aria-label={a.leido ? "Leído" : "Sin leer"}
              />
              <div className={s.avisoBody}>
                <div className={s.avisoHead}>
                  <strong>{a.titulo}</strong>
                  {a.tipo === "importante" && (
                    <span className={`${common.chip} ${common.chipWarn}`}>Importante</span>
                  )}
                </div>
                <p>{a.cuerpo}</p>
              </div>
              <time className={common.muted} dateTime={a.fecha}>
                {formatFecha(a.fecha)}
              </time>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`${common.card} ${s.stat}`}>
      <span className={s.statLabel}>{label}</span>
      <span className={`${s.statValue} ${highlight ? s.statHighlight : ""}`}>{value}</span>
    </div>
  );
}
