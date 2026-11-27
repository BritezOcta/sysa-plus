import { Navigate, Route, Routes } from "react-router";
import EnrollmentPage from "../../pages/EnrollmentPage";
import { StudentLayout, type StudentUser } from "./StudentLayout";
import { StudentNotificationsProvider } from "./StudentNotificationsContext";
import { HomePage } from "./pages/HomePage";
import { PlanMateriasPage } from "./pages/PlanMateriasPage";
import { EstadoAcademicoPage } from "./pages/EstadoAcademicoPage";
import { ExamenesPage } from "./pages/ExamenesPage";
import { InscripcionExamenPage } from "./pages/InscripcionExamenPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { CambioPasswordPage } from "./pages/CambioPasswordPage";
import { CertificadosPage } from "./pages/CertificadosPage";
import { CursadoPage } from "./pages/CursadoPage";
import { AsistenciasPage } from "./pages/AsistenciasPage";
import { AvisosPage } from "./pages/AvisosPage";

/** Opciones del menú que todavía no tienen pantalla propia */
const PLACEHOLDERS = [
  "correlatividad-cursar",
  "correlatividad-rendir",

  "bee",
  "censo",
];

interface Props {
  user: StudentUser;
  onLogout: () => void;
}

/**
 * Se monta en App con:  <Route path="/alumno/*" element={<StudentRoute />} />
 */
export function StudentArea({ user, onLogout }: Props) {
  return (
    <StudentNotificationsProvider>
      <Routes>
        <Route
          element={
            <StudentLayout
              user={user}
              onLogout={onLogout}
              hayRelevamientoPendiente
            />
          }
        >
          <Route index element={<HomePage />} />
          <Route path="plan" element={<PlanMateriasPage />} />
          <Route path="estado" element={<EstadoAcademicoPage />} />
          <Route path="examenes" element={<ExamenesPage />} />
          {/* Cursado, notas de parciales y encuestas docentes */}
          <Route path="cursado" element={<CursadoPage />} />
          {/* RF-06: inscripción a exámenes finales */}
          <Route path="inscripcion-examen" element={<InscripcionExamenPage />} />
          {/* RF-04: inscripción a cursadas */}
          <Route path="inscripcion-cursado" element={<EnrollmentPage />} />
          {/* RF-05: consulta de asistencias */}
          <Route path="asistencias" element={<AsistenciasPage />} />
          {/* RF-11: generación y descarga de certificados */}
          <Route path="certificados" element={<CertificadosPage />} />
          <Route path="password" element={<CambioPasswordPage />} />
          <Route path="avisos" element={<AvisosPage />} />
          {PLACEHOLDERS.map((id) => (
            <Route key={id} path={id} element={<PlaceholderPage id={id} />} />
          ))}
          <Route path="*" element={<Navigate to="/alumno" replace />} />
        </Route>
      </Routes>
    </StudentNotificationsProvider>
  );
}
