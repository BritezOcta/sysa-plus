import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { APP_ROUTES } from './constants'
import AcademicManagementPage from './pages/AcademicManagementPage'
import LoginPage from './pages/LoginPage'

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
        <Route path="*" element={<Navigate to={APP_ROUTES.HOME} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
