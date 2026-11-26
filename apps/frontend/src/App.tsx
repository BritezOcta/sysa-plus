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
import { StudentArea } from "./features/student/StudentArea";
import { getUserInitials } from "./helpers/UserDisplayHelper";
import AcademicManagementPage from "./pages/AcademicManagementPage";
import LoginPage from "./pages/LoginPage";
import TeacherHomePage from "./pages/TeacherHomePage";
import TeacherAttendancePage from "./pages/TeacherAttendancePage";
import TeacherGradesPage from "./pages/TeacherGradesPage";
import TeacherListStudentsPage from "./pages/TeacherListStudentsPage";
import AdminStudentsPage from "./pages/adminStudentsPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";

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
          <Route
            path={APP_ROUTES.ACADEMIC_OFFER}
            element={
              <ProtectedRoute roles={["ADMINISTRADOR"]}>
                <AcademicManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.ADMIN_STUDENTS}
            element={
              <ProtectedRoute roles={["ADMINISTRADOR"]}>
                <AdminStudentsPage />
              </ProtectedRoute>
            }
          />
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
          <Route
            path={APP_ROUTES.TEACHER_AREA}
            element={
              <ProtectedRoute roles={["PROFESOR"]}>
                <TeacherHomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.TEACHER_ATTENDANCE}
            element={
              <ProtectedRoute roles={["PROFESOR"]}>
                <TeacherAttendancePage />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.TEACHER_GRADES}
            element={
              <ProtectedRoute roles={["PROFESOR"]}>
                <TeacherGradesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.TEACHER_STUDENTS}
            element={
              <ProtectedRoute roles={["PROFESOR"]}>
                <TeacherListStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path={APP_ROUTES.CHANGE_PASSWORD}
            element={
              <ProtectedRoute roles={["PROFESOR", "ADMINISTRADOR"]}>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to={APP_ROUTES.HOME} replace />} />
        </Routes>
        <WelcomeToast />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
