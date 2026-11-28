# Avisos mejorados Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar el modal de creación de avisos con vista previa en vivo y abrir en ventana flotante los avisos que no tienen página propia.

**Architecture:** Dos componentes compartidos nuevos (`NoticeCard`, `NoticeDetailModal`) en `components/notices/`, más un helper `getNoticeDestination`. `AvisosPage`, `NotificationBell` y el `BroadcastNoticeModal` rediseñado los consumen. El backend solo cambia valores de `link`.

**Tech Stack:** React 19 + TypeScript + CSS Modules (variables de tema en `styles/variables.css`), react-router, Express + Prisma.

**Spec:** `docs/superpowers/specs/2026-11-27-avisos-mejorados-design.md`

## Global Constraints

- Rama: `feat/notifications`. No commitear en `develop`.
- Estilos en CSS modules con variables de tema (`var(--color-surface)`, `var(--color-text)`, `var(--color-primary)`, …). Sin colores hex fijos en los componentes nuevos o rediseñados.
- Modales sobre `components/ui/ModalShell.tsx` (focus trap, Escape, tono de encabezado).
- Límites: título 120 caracteres, mensaje 1000 (como hoy).
- Textos en español rioplatense ("Escribí", "Tenés").
- Sin cambios de esquema de base de datos ni endpoints nuevos.
- Verificación del frontend: `pnpm -C apps/frontend build` y `pnpm -C apps/frontend lint` sin errores nuevos, más prueba manual. No hay framework de tests en el frontend y no se agrega.

## Review Focus

- Avisos ya guardados con `link: "/alumno/avisos"` → deben abrir la ventana flotante, no navegar.
- Aviso con cuerpo largo (1000 caracteres, sin espacios) → la ventana flotante y la vista previa no se desbordan horizontalmente (`overflow-wrap: anywhere`).
- Modal de creación con campos vacíos → la vista previa muestra placeholders ("Título del aviso", "El mensaje aparecerá acá…"), no una tarjeta vacía.
- Tema alto contraste / modo oscuro del panel de accesibilidad → modal y ventana legibles (solo variables de tema).
- Clic en aviso no leído que abre la ventana → se marca como leído igual que al navegar.

---

### Task 1: Backend: links de avisos

**Files:**
- Modify: `apps/backend/src/services/notifications.service.ts:78` → `link: null`
- Modify: `apps/backend/src/services/teacher.service.ts:328` → `link: null`
- Modify: `apps/backend/src/services/courseEnrollment.service.ts:609` → `link: "/alumno/cursado"`

**Interfaces:**
- Produces: avisos generales y observaciones con `link === null`.

- [ ] **Step 1:** Aplicar los tres cambios. Confirmar que `CreateNotificationInput.link` acepta `null` (el repositorio ya hace `data.link ?? null`). Si el tipo es `string | undefined`, ampliarlo a `string | null`.
- [ ] **Step 2:** Run `pnpm -C apps/backend exec tsc --noEmit` y `pnpm -C apps/backend test`. Expected: sin errores, tests en PASS.
- [ ] **Step 3:** Commit `fix(avisos): avisos sin página propia sin link y corregir ruta de cursado`.

### Task 2: Componentes compartidos `NoticeCard`, `NoticeDetailModal` y helper de destino

**Files:**
- Create: `apps/frontend/src/components/notices/noticeDestination.ts`
- Create: `apps/frontend/src/components/notices/NoticeCard.tsx`
- Create: `apps/frontend/src/components/notices/NoticeDetailModal.tsx`
- Create: `apps/frontend/src/components/notices/Notices.module.css`
- Create: `apps/frontend/src/components/notices/formatNoticeDate.ts` (mover el `formatDate` de `AvisosPage.tsx`, mismo formato `es-AR` dd/mm/yyyy hh:mm)

**Interfaces:**
- Consumes: `NotificationItem` de `api/notifications.api.ts`; `ModalShell`.
- Produces:
  - `getNoticeDestination(item: Pick<NotificationItem, "link">): string | null`: devuelve `null` si `link` es `null`, vacío o `"/alumno/avisos"`; si no, el link.
  - `formatNoticeDate(iso: string): string`
  - `NoticeCard` props: `{ titulo: string; cuerpo: string; tipo: "info" | "importante"; fecha: string; leido: boolean; onClick?: () => void; truncate?: boolean }`. Borde izquierdo 4px (primario si info, ámbar si importante), fondo tenue si no leído, etiqueta "Nuevo", ícono ⚠️ si importante. Con `onClick` se renderiza como `<button>` para el teclado; sin él, `<div>` (vista previa). `truncate` limita el cuerpo a 3 líneas (`-webkit-line-clamp`).
  - `NoticeDetailModal` props: `{ notice: NotificationItem; onClose: () => void }`. `ModalShell` con `tone="warning"` si importante, `title={notice.titulo}`, `subtitle` = "Aviso importante · {fecha}" o "Aviso informativo · {fecha}". Cuerpo con `white-space: pre-wrap; overflow-wrap: anywhere`. Footer con botón primario "Entendido" que cierra y recibe el foco inicial.

- [ ] **Step 1:** Implementar los cinco archivos.
- [ ] **Step 2:** Run build + lint del frontend. Expected: sin errores.
- [ ] **Step 3:** Commit `feat(avisos): componentes compartidos de tarjeta y detalle de aviso`.

### Task 3: Alumno: ventana flotante en Avisos y en la campana

**Files:**
- Modify: `apps/frontend/src/features/student/pages/AvisosPage.tsx`
- Modify: `apps/frontend/src/components/ui/NotificationBell.tsx`

**Interfaces:**
- Consumes: `getNoticeDestination`, `NoticeCard`, `NoticeDetailModal`, `formatNoticeDate` (Task 2).

- [ ] **Step 1:** En `AvisosPage`, reemplazar el `<li>` inline por `<li><NoticeCard … onClick/></li>` con `truncate`. El clic marca como leído si no lo está; después navega a `getNoticeDestination(item)` si no es `null`, o setea `selected` y renderiza `<NoticeDetailModal>`. Quitar el `formatDate` local.
- [ ] **Step 2:** En `NotificationBell.handleClickItem`, aplicar la misma regla: cerrar el desplegable y navegar, o abrir `NoticeDetailModal`. No cambiar el estilo del desplegable.
- [ ] **Step 3:** Run build + lint. Expected: sin errores.
- [ ] **Step 4:** Prueba manual (`pnpm -C apps/frontend dev` + backend). Con un alumno:
  - (a) un aviso general abre la ventana y se marca leído;
  - (b) un aviso de examen navega a `/alumno/examenes`;
  - (c) Escape y clic fuera cierran la ventana;
  - (d) en la campana, lo mismo;
  - (e) un aviso viejo con link `/alumno/avisos` abre la ventana.
- [ ] **Step 5:** Commit `feat(avisos): ventana flotante para avisos sin página propia`.

### Task 4: Rediseño del modal de creación con vista previa

**Files:**
- Modify (reescribir): `apps/frontend/src/components/academic/modals/BrodNoticeModal.tsx`
- Create: `apps/frontend/src/components/academic/modals/BroadcastNoticeModal.module.css`
- Modify: `apps/frontend/src/hooks/useAcademicManagement.ts` (exponer `pushToast` en el return)
- Modify: `apps/frontend/src/pages/AcademicManagementPage.tsx:234-239`

**Interfaces:**
- Consumes: `NoticeCard` (Task 2), `ModalShell`, clases `formBody`/`field`/`modalFooter`/`primaryBtn`/`secondaryBtn`/`errorBanner` de `Modals.module.css`.
- Produces: misma API pública: `BroadcastNoticeModal({ onClose, onSuccess?: (sentCount: number) => void })`.

- [ ] **Step 1:** Reescribir sobre `ModalShell` con `wide` y `tone={type === "importante" ? "warning" : "default"}`. Título "Enviar aviso a alumnos", subtítulo "Llega a todos los alumnos activos del sistema.".
  - Columna izquierda:
    - grupo `role="radiogroup"` con dos tarjetas-botón grandes (`aria-checked`): "ℹ️ Informativo / Novedades generales" y "⚠️ Importante / Requiere atención del alumno";
    - campo Título con contador `n/120`;
    - campo Mensaje (6 filas) con contador `n/1000`.
  - Columna derecha: encabezado "Así lo verá el alumno" y `<NoticeCard>` sin `onClick`, con `leido={false}`, `fecha={new Date().toISOString()}`, `titulo` o "Título del aviso", `cuerpo` o "El mensaje aparecerá acá a medida que lo escribas.". Placeholders con opacidad reducida.
  - Grid: dos columnas desde 720px, apiladas por debajo.
  - Footer: "Cancelar" + primario "Enviar a todos los alumnos" ("Enviando..." mientras envía).
  - Se conserva la validación y el manejo de error actuales; el error se muestra con `errorBanner`.
- [ ] **Step 2:** En `AcademicManagementPage`, reemplazar el `alert(...)` por `pushToast("success", "Aviso enviado", \`Se envió a ${sentCount} alumno(s).\`)`.
- [ ] **Step 3:** Run build + lint. Expected: sin errores.
- [ ] **Step 4:** Prueba manual como admin:
  - la vista previa se actualiza al escribir;
  - el tipo cambia el borde y el color del encabezado;
  - los contadores funcionan;
  - con campos vacíos se ven los placeholders;
  - el envío muestra el toast;
  - el aviso llega al alumno y abre la ventana;
  - con el tema alto contraste se lee bien;
  - con un ancho menor a 720px las columnas se apilan.
- [ ] **Step 5:** Commit `feat(avisos): rediseño del modal de creación con vista previa en vivo`.
