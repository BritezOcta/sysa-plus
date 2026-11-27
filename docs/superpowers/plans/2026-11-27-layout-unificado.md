# Layout unificado (Administrador y Profesor): plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDO: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan checkboxes (`- [ ]`).

**Objetivo:** que admin y profesor usen el mismo marco y la misma paleta (modo claro) que el alumno, sin perder ninguna función y sin cambiar la vista del alumno.

**Arquitectura:**
- `StudentLayout` se generaliza a `components/layout/AppShell.tsx`.
- Cada rol tiene su menú y su envoltorio (`StudentLayout`, `AdminShell`, `TeacherShell`), montado como ruta de layout con `<Outlet>`.
- Las variables `--sa-*` pasan a aplicar a `.sysa-app`, con `.sysa-student` como alias.
- Los colores fijos de los CSS modules de admin y profesor se reemplazan por esas variables.

**Stack:** React 19 + react-router + CSS Modules (Vite). El frontend no tiene runner de tests.

**Spec:** `docs/superpowers/specs/2026-11-27-layout-unificado-design.md`

## Restricciones globales

- **Modo oscuro:** solo para el alumno. En admin y profesor, `data-theme="light"` fijo, sin botón de tema y sin leer `useTheme`.
- **El alumno no cambia:**
  - `features/student/**` solo puede cambiar en `StudentLayout.tsx` (pasa a ser envoltorio de `AppShell`).
  - `styles/theme.css` solo agrega el selector `.sysa-app`.
  - No se tocan `components/enrollment/**`, los estilos de toasts (`.toast*` en `AcademicManagementPage.module.css`, que usan `ToastViewport` y `ToastCard`), `components/academic/Modals.module.css`, `components/ui/**` ni `components/account/**`. Todos los usa el alumno.
- Las URLs, `ProtectedRoute` y los roles permitidos no cambian.
- **Funciones que no pueden perderse:**
  - **Admin:** las 7 secciones; "Recargar datos"; "Auditoría (N)" con el contador "+N"; contraseña; salir.
  - **Profesor:** las 4 páginas; contraseña; salir.
- **`mustChangePassword`:** `/cuenta/contrasena` se muestra sin el marco.
- **Correspondencia de colores** (el implementador decide los casos dudosos y, ante la duda, deja el color original):

  | Colores fijos actuales | Variable |
  |---|---|
  | `#fff` / `#ffffff` | `--sa-surface` |
  | `#f8fafc`, `#f1f5f9`, `#f3f6fa`, `#f5f8fc` | `--sa-surface-2` |
  | Fondos de página `#eef1f4`, `#eef2f7` | `--sa-bg` |
  | Bordes `#e2e8f0`, `#cbd5e1`, `#dbe3ee`, `#e5e7eb` | `--sa-border` |
  | Texto `#0f172a`, `#111827`, `#1e293b`, `#20252b` | `--sa-text` |
  | Texto `#334155`, `#475569`, `#64748b`, `#68727d` | `--sa-text-muted` |
  | Azules primarios (`#0284c7`, `#0369a1`, `#008ccc`, `#2563eb`) | `--sa-accent` / `--sa-accent-strong`, y los fondos azules claros a `--sa-accent-soft` |
  | Verdes | `--sa-ok` / `--sa-ok-soft` |
  | Ámbar | `--sa-warn` / `--sa-warn-soft` |
  | Rojos | `--sa-danger` / `--sa-danger-soft` |

  Los radios de tarjetas pasan a `--sa-radius` y las sombras a `--sa-shadow`. Se mantienen los colores con significado propio, como los tipos de correlatividad del canvas.
- **Verificación de cada tarea:** `pnpm --filter sysaplus build` sin errores, y `pnpm --filter sysaplus lint` con solo los 3 errores preexistentes (StudentLayout:38, TeacherAttendancePage:123, TeacherGradesPage:195). El de `StudentLayout:38` se mueve a `AppShell` con el mismo efecto, así que no cuenta como nuevo.
- **Puntos de control:** al final de las Tasks 2, 3 y 5 se detiene la ejecución y se le pide a la persona que revise las pantallas indicadas. No se sigue sin su visto bueno, porque lo exige el spec.

## Foco de revisión

- **Alumno con modo oscuro guardado entra después como admin en el mismo navegador:** el admin se ve en claro. `AdminShell` no lee `useTheme` (Task 2, chequeo manual).
- **Profesor recarga la página estando en `/profesor/notas`:** ve el marco, con "Notas y actas" resaltado y la ubicación correcta (Task 2).
- **Admin con `mustChangePassword`:** en `/cuenta/contrasena` ve solo el formulario, sin el menú (Task 2).
- **Ancho de celular:** en admin y profesor, el menú se abre con el botón y se cierra con Escape o tocando afuera, igual que en el alumno (Task 2).
- **Doble padding o doble fondo:** las páginas que traían su propio `min-height: 100vh`, fondo y padding no deberían verse con márgenes dobles dentro del marco. Se corrige en las Tasks 3 a 5.

---

## Etapa 1: marco y menús

### Task 1: `AppShell` y alumno como envoltorio

**Archivos:**
- Crear: `apps/frontend/src/components/layout/AppShell.tsx`. Se mueve ahí el JSX y la lógica de `StudentLayout.tsx`.
- Crear: `apps/frontend/src/components/layout/AppShell.module.css`. Se mueve con `git mv` desde `features/student/StudentLayout.module.css`, sin cambios.
- Modificar: `apps/frontend/src/features/student/StudentLayout.tsx`, que pasa a ser un envoltorio. Exporta lo mismo (`StudentLayout` y `StudentUser`) y conserva sus props.
- Modificar: `apps/frontend/src/styles/theme.css`. Agregar `.sysa-app` a los selectores del tema claro y del oscuro: `.sysa-app, .sysa-app[data-theme="light"], .sysa-student, …`.

**Interfaces:**
- Produce `AppShell` con estas props:

  ```ts
  interface AppShellProps {
    navGroups: NavGroup[];        // el primer ítem del primer grupo es el inicio
    homeItem: NavItem;            // fallback de la ubicación y `end` del NavLink de inicio
    crumbRoot: string;            // "Autogestión alumno" | "Área docente" | "Administración"
    allowDarkMode: boolean;
    user: { name: string; meta: string; initials: string };
    onLogout: () => void;
    badgeFor?: (item: NavItem) => { text: string; warn: boolean } | null;
  }
  ```

  Los tipos `NavItem` y `NavGroup` se mueven a `components/layout/navTypes.ts`. `features/student/nav.ts` los re-exporta, así no cambia ningún import del alumno. El `badge` de `NavItem` pasa a ser `string` opcional.
- **Clases del contenedor:** `` `sysa-app ${allowDarkMode ? "sysa-student" : ""} ${styles.shell}` ``. El `data-theme` es el de `useTheme()` si `allowDarkMode`, y `"light"` si no. El botón de tema solo se muestra si `allowDarkMode`.
- **Inicio del menú:** `end` en el `NavLink` cuando `item.to === homeItem.to`. Hoy se compara `item.id === "inicio"`; el resultado es el mismo para el alumno.
- **Ubicación:** sale de `navGroups.flatMap(g => g.items)` con la ruta normalizada, y si no hay coincidencia, `homeItem`. El fallback de normalización es `homeItem.to`, en lugar del `"/alumno"` fijo actual.
- **Alumno:** `StudentLayout` pasa `NAV_GROUPS`, `HOME_ITEM`, `"Autogestión alumno"`, `allowDarkMode: true`, `user: { name: "${nombre} ${apellido}", meta: "Legajo ${legajo}", initials }` y un `badgeFor` que reproduce la lógica actual de avisos y relevamiento.

- [ ] **Step 1:** hacer la extracción y el envoltorio como se describe en Interfaces.
- [ ] **Step 2: Chequeo de equivalencia del alumno, leyendo el diff.**
  - El HTML que genera `AppShell` con las props del alumno tiene que tener los mismos elementos, clases, textos y atributos `aria-*` que el `StudentLayout` actual.
  - Única diferencia aceptada: la clase extra `sysa-app` en el contenedor.
  - Anotar el resultado en el ledger.
- [ ] **Step 3:** build y lint según las restricciones globales.
- [ ] **Step 4:** commit `refactor: AppShell compartido a partir del layout del alumno`.

### Task 2: Menús de admin y profesor, rutas anidadas y migración de encabezados

**Archivos:**
- Crear: `apps/frontend/src/components/layout/roleNav.ts`, con `ADMIN_HOME`, `ADMIN_NAV_GROUPS`, `TEACHER_HOME` y `TEACHER_NAV_GROUPS`. Los textos y el orden son los del spec, sección 2. Cada `to` sale de `APP_ROUTES`. Íconos:

  | Ítem | Ícono |
  |---|---|
  | Oferta académica | `book` |
  | Docentes | `clipboardList` |
  | Inscripciones y calendario | `calendarPlus` |
  | Alumnos | `fileText` |
  | Actas | `pencil` |
  | Reportes | `chart` |
  | Usuarios | `lock` |
  | Panel docente | `home` |
  | Asistencias | `calendarCheck` |
  | Notas y actas | `pencil` |
  | Alumnos y observaciones | `fileText` |
  | Contraseña | `lock` |

- Crear: `apps/frontend/src/components/layout/RoleShells.tsx`.
  - `AdminShell()` y `TeacherShell()`: leen `useAuthenticatedUser()` y `useAuth().logout`, y navegan a `APP_ROUTES.LOGIN` después de salir, igual que `StudentRoute` en `App.tsx`. Renderizan `AppShell` con `allowDarkMode: false` y `meta: ROLE_LABELS[user.role]`.
  - `AccountShell()`: si `user.mustChangePassword`, devuelve `<Outlet />` sin marco; si no, el shell del rol (admin o profesor).
- Modificar: `apps/frontend/src/App.tsx`. Las rutas de admin y profesor pasan a ser hijas de una ruta de layout. Las URLs y los roles no cambian:

  ```tsx
  <Route element={<ProtectedRoute roles={["ADMINISTRADOR"]}><AdminShell /></ProtectedRoute>}> …7 rutas admin… </Route>
  ```

  Lo mismo para el profesor, y `/cuenta/contrasena` bajo `<ProtectedRoute roles={["PROFESOR","ADMINISTRADOR"]}><AccountShell /></ProtectedRoute>`. Antes de cambiar el `roles` de la ruta de contraseña, revisar cuáles tiene hoy.
- Modificar: las 6 páginas con `<TopNavbar` (`AcademicManagementPage`, `AdminEnrollmentPage`, `AdminRecordsPage`, `adminStudentsPage`, `AdminUsersPage`, `TeacherAssignmentPage`). Se saca `<TopNavbar …/>` y su import.
- Modificar: `AcademicManagementPage.tsx`. "Recargar datos" (`handleReloadData`) y "Auditoría ({auditLogs.length})" con `+{unreadAuditCount}` (`openAuditDrawer`) pasan como botones al `sectionHeader` existente, con las clases `resetMockBtn`, `auditBtn` y `unreadDot` del mismo módulo.
- Modificar: `AdminReportsPage.tsx`. Se saca el `<Link>` "← Volver a Gestión Académica".
- Modificar: `TeacherHomePage.tsx`. Se sacan "Cambiar contraseña" y "Cerrar sesión" del encabezado; quedan el título y el saludo.
- Modificar: `TeacherAttendancePage.tsx`, `TeacherGradesPage.tsx` y `TeacherListStudentsPage.tsx`. Se saca el `backLink` "← Volver al Panel Docente".
- Modificar: `pages/ChangePasswordPage.tsx`.
  - Dentro del marco ya no necesita su propio `sysa-student` con `minHeight` ni el padding.
  - Sin marco (`mustChangePassword`) tiene que verse como hoy: conservar el envoltorio solo en ese caso.
  - "Volver" se mantiene, porque ya está condicionado a `!mustChangePassword`.
- Borrar: `components/layout/TopNavbar.tsx` y `UserProfilePill.tsx`, si `grep` confirma que nadie más los importa.

- [ ] **Step 1:** `roleNav.ts` y `RoleShells.tsx`.
- [ ] **Step 2:** rutas anidadas en `App.tsx`.
- [ ] **Step 3:** migración de encabezados y botones de las páginas, como se lista en Archivos.
- [ ] **Step 4:** `grep -rn "TopNavbar\|UserProfilePill" apps/frontend/src` sin resultados después de borrarlos. Build y lint.
- [ ] **Step 5: Recorrido por HTTP.**
  - Levantar el backend de desarrollo contra `sysaplus_test_rf10` con `db:seed:demo` (puerto 3010) y el frontend con `vite --port 5180`.
  - `curl` a cada ruta de admin, profesor y alumno tiene que devolver 200 con el `index.html` de la SPA.
  - Cerrar los procesos al terminar, incluidos los hijos (lección de RF-10).
- [ ] **Step 6:** commit `feat: marco y menú compartidos para administrador y profesor`.
- [ ] **Step 7: PUNTO DE CONTROL 1.** Detenerse y pedir a la persona que revise:
  - **Como admin** (`11111111` / `Admin123!`): las 7 secciones desde el menú; Recargar y Auditoría en Oferta académica; contraseña; salir.
  - **Como profesor** (`22222222` / `Profesor123!`): las 4 páginas.
  - **Como alumna** (`33333333` / `Alumno123!`): que todo se vea igual que antes, incluido el modo oscuro.
  - **Ancho de celular** en los tres roles.

  Antes de pedir la revisión, indicarle que reconstruya con `docker compose up -d --build` o que use el servidor de desarrollo.

## Etapa 2: profesor

### Task 3: Páginas del profesor en la paleta del alumno

**Archivos:**
- Modificar: `pages/TeacherHomePage.module.css`, `TeacherAttendancePage.module.css`, `TeacherGradesPage.module.css` y `TeacherListStudentsPage.module.css`. Reemplazar los colores según la tabla de las restricciones globales.
- Modificar: los 4 `Teacher*Page.tsx`.
  - El encabezado de contenido pasa a `common.pageHeader`, `common.title` y `common.subtitle`, importando `features/student/common.module.css`, como ya hace `ChangePasswordPage`.
  - El contenedor de página pasa a `common.page`.
  - Se sacan del CSS de la página el `min-height`, el fondo y el padding que ahora pone el marco.

- [ ] **Step 1:** colores y contenedores de las 4 páginas.
- [ ] **Step 2:** `grep -oiE '#[0-9a-f]{3,6}\b'` sobre los 4 CSS. Cada color que quede tiene que tener una razón anotada en el ledger.
- [ ] **Step 3:** build y lint.
- [ ] **Step 4:** commit `style: páginas del profesor con la paleta del alumno`.
- [ ] **Step 5: PUNTO DE CONTROL 2.** La persona revisa las 4 páginas del profesor con datos: Asistencias tomando una clase, Notas de una comisión, Alumnos con observaciones.

## Etapa 3: administrador

### Task 4: Páginas simples del admin

**Archivos:**
- Modificar: `components/admin/AdminPages.module.css`, `components/teacherAssignment/TeacherAssignment.module.css` y `components/adminCalendar/*` (si tiene CSS propio). Colores según la tabla.
- Modificar: `AdminUsersPage.tsx`, `AdminRecordsPage.tsx`, `adminStudentsPage.tsx`, `TeacherAssignmentPage.tsx`, `AdminEnrollmentPage.tsx` y `AdminReportsPage.tsx`. El encabezado de cada página pasa a `common.pageHeader`.
- En `AdminReportsPage.tsx`, los `style={{…}}` inline del encabezado, los filtros y las tablas pasan a clases (de `common.module.css` o de un `AdminReportsPage.module.css` nuevo), con las variables `--sa-*`.
- Estas páginas usan clases de `AcademicManagementPage.module.css` (`pageLayout`, `mainContent`, `careersSection`, `sectionHeader`). Los cambios a ese archivo van en la Task 5. Acá solo se reemplazan los usos de `pageLayout` y `mainContent` por `common.page`, si no cambian el contenido.

- [ ] **Step 1:** CSS y encabezados de las 6 páginas.
- [ ] **Step 2:** grep de colores restantes con su razón en el ledger. Build y lint.
- [ ] **Step 3:** commit `style: páginas simples del administrador con la paleta del alumno`.

### Task 5: Oferta académica, canvas y `AcademicManagementPage.module.css`

**Archivos:**
- Crear: `components/ui/Toast.module.css`, con los estilos `.toast*` que hoy están en `AcademicManagementPage.module.css`, **copiados sin cambios**.
- Modificar: `ToastViewport.tsx` y `ToastCard.tsx`, que pasan a importar el módulo nuevo. Así los avisos quedan idénticos para todos los roles.
- Modificar: `pages/AcademicManagementPage.module.css` (sin las clases `.toast*`) y `components/academic/**/*.module.css`, **excepto `Modals.module.css`**. Colores según la tabla, conservando los de los tipos de correlatividad y los del simulador.

- [ ] **Step 1:** separar los toasts. Comparar con `git diff --stat` y leyendo el código que el contenido de las reglas `.toast*` es idéntico.
- [ ] **Step 2:** colores de `AcademicManagementPage.module.css` y del canvas.
- [ ] **Step 3:** grep de colores restantes con su razón en el ledger. Build y lint.
- [ ] **Step 4:** commit `style: oferta académica y canvas con la paleta del alumno`.
- [ ] **Step 5: PUNTO DE CONTROL 3.** La persona revisa las 7 secciones del admin: canvas con correlatividades, modales de materia y carrera, cajón de auditoría, calendario, reportes con exportación. También que los avisos flotantes del alumno se vean como antes (inscripción a cursada).
