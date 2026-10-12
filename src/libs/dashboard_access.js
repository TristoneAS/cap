import { getSafeRedirectPath } from "@/libs/auth_session";
import {
  buildCapAccess,
  defaultHomeForAccess,
  isAuditorLpaSinRolesCap,
  isSoloMantenimientoCap,
  isSoloProcesosCap,
  readCapAccessClient,
} from "@/libs/cap_roles";

export const NON_ADMIN_HOME = "/dashboard/auditorias";

const CALIDAD_ADMIN_PREFIXES = [
  "/dashboard/catalogos",
  "/dashboard/usuarios",
  "/dashboard/auditorias/generar",
  "/dashboard/auditorias/seguimiento",
  "/dashboard/auditorias/asignaciones",
];

const MANTENIMIENTO_PREFIX = "/dashboard/mantenimiento";
const PROCESOS_PREFIX = "/dashboard/procesos";

/** Panel inicio y catálogos LPA: solo CAP_Admin. */
export function isCalidadAdminPath(pathname) {
  const path = String(pathname ?? "").trim();
  if (path === "/dashboard") return true;
  return CALIDAD_ADMIN_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** @deprecated Use isCalidadAdminPath o canAccessDashboardPath */
export function isAdminOnlyDashboardPath(pathname) {
  const path = String(pathname ?? "").trim();
  if (isCalidadAdminPath(path)) return true;
  return (
    isMantenimientoPath(path) ||
    isProcesosPath(path)
  );
}

export function isMantenimientoPath(pathname) {
  const path = String(pathname ?? "").trim();
  return path === MANTENIMIENTO_PREFIX || path.startsWith(`${MANTENIMIENTO_PREFIX}/`);
}

export function isProcesosPath(pathname) {
  const path = String(pathname ?? "").trim();
  return path === PROCESOS_PREFIX || path.startsWith(`${PROCESOS_PREFIX}/`);
}

/** ¿Puede abrir esta ruta según roles CAP? */
const PROCESOS_CATALOGO_POKA = "/dashboard/catalogos/preguntas-poka-yoke";

const AUDITOR_LPA_SOLO_BLOQUEADOS = [
  "/dashboard/auditorias/generar",
  "/dashboard/auditorias/seguimiento",
  "/dashboard/auditorias/asignaciones",
];

/** Rutas LPA para cualquier rol (Mis auditorías, Mi equipo, ejecutar). */
export function isAuditorLpaSoloPath(pathname) {
  const path = String(pathname ?? "").trim();
  if (path === NON_ADMIN_HOME) return true;
  if (AUDITOR_LPA_SOLO_BLOQUEADOS.some((p) => path === p || path.startsWith(`${p}/`))) {
    return false;
  }
  if (path.startsWith("/dashboard/auditorias/")) return true;
  return false;
}

export function canAccessDashboardPath(pathname, access) {
  const path = String(pathname ?? "").trim();
  if (!path.startsWith("/dashboard")) return false;

  /** Todos los roles CAP ejecutan LPAs (listado, detalle, ejecutar). */
  if (isAuditorLpaSoloPath(path)) return true;

  if (isAuditorLpaSinRolesCap(access)) {
    return false;
  }

  if (isSoloMantenimientoCap(access)) {
    return isMantenimientoPath(path);
  }

  if (isSoloProcesosCap(access)) {
    if (path === PROCESOS_CATALOGO_POKA) return true;
    return isProcesosPath(path);
  }

  if (path === PROCESOS_CATALOGO_POKA) {
    return access.canProcesos || access.canCalidadAdmin;
  }

  if (isCalidadAdminPath(path)) return access.canCalidadAdmin;
  if (isMantenimientoPath(path)) return access.canMantenimiento;
  if (isProcesosPath(path)) return access.canProcesos;

  const soloAreaCap = access.isCapMantenimiento || access.isCapProcesos;
  if (soloAreaCap && !access.isCapAdmin) return false;
  return true;
}

export function resolveDeniedRedirect(pathname, access) {
  if (canAccessDashboardPath(pathname, access)) return null;
  return defaultHomeForAccess(access, access.canCalidadAdmin);
}

/** Administrador CAP (Calidad admin; legacy localStorage). */
export function isAdminClient() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("isAdmin") === "true";
}

/** Destino tras login según rol CAP y redirect seguro. */
export function getPostLoginRedirect(redirectParam, capAccessInput) {
  const access =
    capAccessInput?.roles != null
      ? capAccessInput
      : buildCapAccess(Array.isArray(capAccessInput) ? capAccessInput : []);

  const safe = getSafeRedirectPath(redirectParam);
  if (canAccessDashboardPath(safe, access)) return safe;
  return defaultHomeForAccess(access, access.canCalidadAdmin);
}

/** Lectura de acceso CAP en cliente (menú y guards). Fuente: localStorage `capAccess`. */
export function getCapAccessClient() {
  return readCapAccessClient();
}
