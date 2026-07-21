import { getSafeRedirectPath } from "@/libs/auth_session";

export const NON_ADMIN_HOME = "/dashboard/auditorias";

const ADMIN_ONLY_PREFIXES = [
  "/dashboard/catalogos",
  "/dashboard/usuarios",
  "/dashboard/auditorias/generar",
  "/dashboard/auditorias/seguimiento",
  "/dashboard/auditorias/asignaciones",
];

/** Rutas que solo el administrador puede ver. */
export function isAdminOnlyDashboardPath(pathname) {
  const path = String(pathname ?? "").trim();
  if (path === "/dashboard") return true;
  return ADMIN_ONLY_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** Administrador CAP (solo cliente; misma fuente que Login). */
export function isAdminClient() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("isAdmin") === "true";
}

/** Destino tras login según rol. */
export function getPostLoginRedirect(redirectParam, isAdmin) {
  const safe = getSafeRedirectPath(redirectParam);
  if (isAdmin) return safe;
  if (isAdminOnlyDashboardPath(safe)) return NON_ADMIN_HOME;
  return safe;
}
