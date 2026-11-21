import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router'
import { AuthProvider, useAuth, useAuthenticatedUser } from './auth/AuthContext'
import { GuestOnlyRoute, ProtectedRoute } from './auth/ProtectedRoute'
import { WelcomeToast } from './auth/WelcomeToast'
import { APP_ROUTES } from './constants'
import { ESTUDIANTE } from './data/mockStudentData'
import { StudentArea } from './features/student/StudentArea'
import { getUserInitials } from './helpers/UserDisplayHelper'
import AcademicManagementPage from './pages/AcademicManagementPage'
import EnrollmentPage from './pages/EnrollmentPage'
import LoginPage from './pages/LoginPage'
import TeacherHomePage from './pages/TeacherHomePage'

function StudentRoute() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const user = useAuthenticatedUser()

  async function handleLogout() {
    await logout()
    navigate(APP_ROUTES.LOGIN, { replace: true })
  }

  return (
    <StudentArea
      user={{
        nombre: user.firstName,
        apellido: user.lastName,
        legajo: user.legajo ?? '',
        iniciales: getUserInitials(user),
        // Carrera: sigue mockeada hasta el RF-09 (estado académico).
        carrera: ESTUDIANTE.carrera,
      }}
      onLogout={() => void handleLogout()}
    />
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path={APP_ROUTES.HOME}
            element={
              <GuestOnlyRoute>
                <LoginPage />
              </GuestOnlyRoute>
            }
          />
          <Route
            path={APP_ROUTES.LOGIN}
            element={
              <GuestOnlyRoute>
                <LoginPage />
              </GuestOnlyRoute>
            }
          />
          <Route
            path={APP_ROUTES.ACADEMIC_OFFER}
            element={
              <ProtectedRoute roles={['ADMINISTRADOR']}>
                <AcademicManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.ENROLLMENT}
            element={
              <ProtectedRoute roles={['ALUMNO']}>
                <EnrollmentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={`${APP_ROUTES.STUDENT_AREA}/*`}
            element={
              <ProtectedRoute roles={['ALUMNO']}>
                <StudentRoute />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.TEACHER_AREA}
            element={
              <ProtectedRoute roles={['PROFESOR']}>
                <TeacherHomePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={APP_ROUTES.HOME} replace />} />
        </Routes>
        <WelcomeToast />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
