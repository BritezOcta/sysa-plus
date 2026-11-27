import { Link } from "react-router";
import { useAuthenticatedUser } from "../../../auth/AuthContext";
import { Icon } from "../../../components/Icon";
import { useAcademicStatus } from "../../../hooks/useAcademicStatus";
import { AcademicStatusFallback } from "../AcademicStatusFallback";
import { getNavItem } from "../nav";
import { useStudentNotifications } from "../StudentNotificationsContext";
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

function formatFecha(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HomePage() {
  const user = useAuthenticatedUser();
  const { state, retry } = useAcademicStatus();
  const { notifications, unreadCount: sinLeer } = useStudentNotifications();
  const avisos = notifications.slice(0, 3);
  const quick = QUICK_IDS.map(getNavItem).filter(
    (i): i is NonNullable<typeof i> => Boolean(i),
  );

  return (
    <div className={common.page}>
      {state.status === "ready" ? (
        <>
          <section className={s.hero}>
            <div>
              <p className={s.heroKicker}>Autogestión alumno</p>
              <h1 className={s.heroTitle}>Hola, {user.firstName}</h1>
              <p className={s.heroText}>{state.data.student.careerName}</p>
              <div className={s.heroChips}>
                <span className={s.heroChip}>
                  Plan {state.data.student.studyPlan}
                </span>
                <span className={s.heroChip}>Legajo {user.legajo}</span>
              </div>
            </div>
            <div className={s.heroRight}>
              <span className={s.heroPct}>
                {state.data.summary.progressPercent}%
              </span>
              <span className={s.heroPctLabel}>de la carrera aprobada</span>
            </div>
          </section>

          <section className={s.stats} aria-label="Resumen académico">
            <Stat
              label="Materias aprobadas"
              value={`${state.data.summary.approved} / ${state.data.summary.totalSubjects}`}
            />
            <Stat
              label="Promedio"
              value={
                state.data.summary.average === null
                  ? "—"
                  : state.data.summary.average.toFixed(2)
              }
            />
            <Stat
              label="Cursando ahora"
              value={String(state.data.summary.inProgress)}
            />
            <Stat
              label="Avisos sin leer"
              value={String(sinLeer)}
              highlight={sinLeer > 0}
            />
          </section>
        </>
      ) : (
        <AcademicStatusFallback state={state} onRetry={retry} />
      )}

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
          <Link
            to="/alumno/avisos"
            className={`${common.btn} ${common.btnGhost}`}
          >
            Ver todos
          </Link>
        </div>
        <ul className={s.avisos}>
          {avisos.map((a) => (
            <li key={a.id} className={s.aviso}>
              <span
                className={`${s.dot} ${a.leido ? s.dotRead : ""}`}
                aria-label={a.leido ? "Leído" : "Sin leer"}
              />
              <div className={s.avisoBody}>
                <div className={s.avisoHead}>
                  <strong>{a.titulo}</strong>
                  {a.tipo === "importante" && (
                    <span className={`${common.chip} ${common.chipWarn}`}>
                      Importante
                    </span>
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

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`${common.card} ${s.stat}`}>
      <span className={s.statLabel}>{label}</span>
      <span className={`${s.statValue} ${highlight ? s.statHighlight : ""}`}>
        {value}
      </span>
    </div>
  );
}
