import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router'
import { APP_ROUTES } from './constants'
import { ESTUDIANTE } from './data/mockStudentData'
import { StudentArea } from './features/student/StudentArea'
import AcademicManagementPage from './pages/AcademicManagementPage'
import EnrollmentPage from './pages/EnrollmentPage'
import LoginPage from './pages/LoginPage'


function StudentRoute() {
  const navigate = useNavigate()

  const logout = () => {
    
    navigate(APP_ROUTES.LOGIN)
  }

  return <StudentArea user={ESTUDIANTE} onLogout={logout} />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={APP_ROUTES.HOME} element={<LoginPage />} />
        <Route
          path={APP_ROUTES.ACADEMIC_OFFER}
          element={<AcademicManagementPage />}
        />
        <Route path={APP_ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={APP_ROUTES.ENROLLMENT} element={<EnrollmentPage />} />
        <Route path="/alumno/*" element={<StudentRoute />} />
        <Route path="*" element={<Navigate to={APP_ROUTES.HOME} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
