import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router";
import {
  AuthProvider,
  useAuth,
  useAuthenticatedUser,
} from "./auth/AuthContext";
import { GuestOnlyRoute, ProtectedRoute } from "./auth/ProtectedRoute";
import { WelcomeToast } from "./auth/WelcomeToast";
import { APP_ROUTES } from "./constants";
import { AccountShell, AdminShell, TeacherShell } from "./components/layout/RoleShells";
import { StudentArea } from "./features/student/StudentArea";
import { getUserInitials } from "./helpers/UserDisplayHelper";
import AcademicManagementPage from "./pages/AcademicManagementPage";
import LoginPage from "./pages/LoginPage";
import TeacherHomePage from "./pages/TeacherHomePage";
import TeacherAttendancePage from "./pages/TeacherAttendancePage";
import TeacherGradesPage from "./pages/TeacherGradesPage";
import TeacherListStudentsPage from "./pages/TeacherListStudentsPage";
import AdminStudentsPage from "./pages/adminStudentsPage";
import AdminRecordsPage from "./pages/AdminRecordsPage";
import VerifyCertificatePage from "./pages/VerifyCertificatePage";
import TeacherAssignmentPage from "./pages/TeacherAssignmentPage";
import AdminEnrollmentPage from "./pages/AdminEnrollmentPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import AdminReportsPage from "./pages/AdminReportsPage";

function StudentRoute() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const user = useAuthenticatedUser();

  async function handleLogout() {
    await logout();
    navigate(APP_ROUTES.LOGIN, { replace: true });
  }

  return (
    <StudentArea
      user={{
        nombre: user.firstName,
        apellido: user.lastName,
        legajo: user.legajo ?? "",
        iniciales: getUserInitials(user),
      }}
      onLogout={() => void handleLogout()}
    />
  );
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
          {/* RF-11: verificación pública de certificados (sin sesión, la abre el QR). */}
          <Route
            path={APP_ROUTES.VERIFY_CERTIFICATE}
            element={<VerifyCertificatePage />}
          />
          <Route
            path={`${APP_ROUTES.VERIFY_CERTIFICATE}/:code`}
            element={<VerifyCertificatePage />}
          />
          {/* Administrador/Director: todas sus pantallas dentro del marco común. */}
          <Route
            element={
              <ProtectedRoute roles={["ADMINISTRADOR"]}>
                <AdminShell />
              </ProtectedRoute>
            }
          >
            <Route path={APP_ROUTES.ACADEMIC_OFFER} element={<AcademicManagementPage />} />
            <Route path={APP_ROUTES.ADMIN_STUDENTS} element={<AdminStudentsPage />} />
            <Route path={APP_ROUTES.ADMIN_REPORTS} element={<AdminReportsPage />} />
            <Route path={APP_ROUTES.ADMIN_TEACHER_ASSIGNMENTS} element={<TeacherAssignmentPage />} />
            <Route path={APP_ROUTES.ADMIN_ENROLLMENT} element={<AdminEnrollmentPage />} />
            <Route path={APP_ROUTES.ADMIN_USERS} element={<AdminUsersPage />} />
            <Route path={APP_ROUTES.ADMIN_RECORDS} element={<AdminRecordsPage />} />
          </Route>
          {/* Ruta vieja: la inscripción a cursada (RF-04) vive dentro del menú del alumno. */}
          <Route
            path={APP_ROUTES.ENROLLMENT}
            element={
              <Navigate
                to={`${APP_ROUTES.STUDENT_AREA}/inscripcion-cursado`}
                replace
              />
            }
          />
          <Route
            path={`${APP_ROUTES.STUDENT_AREA}/*`}
            element={
              <ProtectedRoute roles={["ALUMNO"]}>
                <StudentRoute />
              </ProtectedRoute>
            }
          />
          {/* Profesor: todas sus pantallas dentro del marco común. */}
          <Route
            element={
              <ProtectedRoute roles={["PROFESOR"]}>
                <TeacherShell />
              </ProtectedRoute>
            }
          >
            <Route path={APP_ROUTES.TEACHER_AREA} element={<TeacherHomePage />} />
            <Route path={APP_ROUTES.TEACHER_ATTENDANCE} element={<TeacherAttendancePage />} />
            <Route path={APP_ROUTES.TEACHER_GRADES} element={<TeacherGradesPage />} />
            <Route path={APP_ROUTES.TEACHER_STUDENTS} element={<TeacherListStudentsPage />} />
          </Route>
          {/* Cambio de contraseña de Profesor y Administrador (sin marco si es obligatorio). */}
          <Route
            element={
              <ProtectedRoute roles={["PROFESOR", "ADMINISTRADOR"]}>
                <AccountShell />
              </ProtectedRoute>
            }
          >
            <Route path={APP_ROUTES.CHANGE_PASSWORD} element={<ChangePasswordPage />} />
          </Route>
          <Route path="*" element={<Navigate to={APP_ROUTES.HOME} replace />} />
        </Routes>
        <WelcomeToast />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
