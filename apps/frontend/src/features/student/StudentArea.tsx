import { Navigate, Route, Routes } from 'react-router'
import { AVISOS } from '../../data/mockStudentData'
import EnrollmentPage from '../../pages/EnrollmentPage'
import { StudentLayout, type StudentUser } from './StudentLayout'
import { HomePage } from './pages/HomePage'
import { PlanMateriasPage } from './pages/PlanMateriasPage'
import { EstadoAcademicoPage } from './pages/EstadoAcademicoPage'
import { InscripcionExamenPage } from './pages/InscripcionExamenPage'
import { PlaceholderPage } from './pages/PlaceholderPage'

/** Opciones del menú que todavía no tienen pantalla propia */
const PLACEHOLDERS = [
  'examenes',
  'cursado',
  'correlatividad-cursar',
  'correlatividad-rendir',
  'certificados',
  'bee',
  'password',
  'censo',
  'avisos',
]

interface Props {
  user: StudentUser
  onLogout: () => void
}

/**
 * Se monta en App con:  <Route path="/alumno/*" element={<StudentRoute />} />
 */
export function StudentArea({ user, onLogout }: Props) {
  const avisosSinLeer = AVISOS.filter((a) => !a.leido).length // TODO: venir de la API

  return (
    <Routes>
      <Route
        element={
          <StudentLayout
            user={user}
            onLogout={onLogout}
            avisosSinLeer={avisosSinLeer}
            hayRelevamientoPendiente
          />
        }
      >
        <Route index element={<HomePage />} />
        <Route path="plan" element={<PlanMateriasPage />} />
        <Route path="estado" element={<EstadoAcademicoPage />} />
        <Route path="inscripcion-examen" element={<InscripcionExamenPage />} />
        {/* Tu página de inscripción existente, dentro del menú (sin su TopNavbar) */}
        <Route path="inscripcion-cursado" element={<EnrollmentPage embedded />} />
        {PLACEHOLDERS.map((id) => (
          <Route key={id} path={id} element={<PlaceholderPage id={id} />} />
        ))}
        <Route path="*" element={<Navigate to="/alumno" replace />} />
      </Route>
    </Routes>
  )
}
