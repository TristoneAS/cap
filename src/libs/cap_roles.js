/** Roles devueltos por el servidor CAP/AUTHENTICATE (array `roles`). */
export const CAP_ROLE_ADMIN = "CAP_Admin";
export const CAP_ROLE_MANTENIMIENTO = "CAP_Mantenimiento";
export const CAP_ROLE_PROCESOS = "CAP_Procesos";
/** Auditores LPA (sin menú Calidad / Mant / Procesos). */
export const CAP_ROLE_GENERICO = "CAP_Generico";

const PRIVILEGED_CAP_ROLES = new Set([
  CAP_ROLE_ADMIN,
  CAP_ROLE_MANTENIMIENTO,
  CAP_ROLE_PROCESOS,
]);

const GROUP_TO_ROLE = {
  "TFT.DEL.PAGES_CAP_Admin": CAP_ROLE_ADMIN,
  "TFT.DEL.PAGES_CAP_Mantenimiento": CAP_ROLE_MANTENIMIENTO,
  "TFT.DEL.PAGES_CAP_Procesos": CAP_ROLE_PROCESOS,
  "TFT.DEL.PAGES_CAP_Generico": CAP_ROLE_GENERICO,
};

function normalizeRoleName(value) {
  return String(value ?? "").trim();
}

/** Extrae roles CAP desde `roles` del JSON de auth (con respaldo en `groups`). */
export function extractCapRoles(authPayload) {
  const fromRoles = Array.isArray(authPayload?.roles)
    ? authPayload.roles.map(normalizeRoleName).filter(Boolean)
    : [];

  const fromGroups = Array.isArray(authPayload?.groups)
    ? authPayload.groups
        .map((g) => GROUP_TO_ROLE[normalizeRoleName(g)])
        .filter(Boolean)
    : [];

  const fromDataGroups = Array.isArray(authPayload?.data?.groups)
    ? authPayload.data.groups
        .map((g) => GROUP_TO_ROLE[normalizeRoleName(g?.cn ?? g)])
        .filter(Boolean)
    : [];

  return [...new Set([...fromRoles, ...fromGroups, ...fromDataGroups])];
}

/**
 * Tras CAP/AUTHENTICATE: usuarios normales llevan CAP_Generico (sin Admin/Mant/Procesos).
 */
export function normalizeCapRolesFromAuth(authPayload) {
  const extracted = extractCapRoles(authPayload);
  const hasPrivileged = extracted.some((r) => PRIVILEGED_CAP_ROLES.has(r));
  if (hasPrivileged) return extracted;

  if (extracted.includes(CAP_ROLE_GENERICO)) return extracted;

  if (extracted.length === 0) return [CAP_ROLE_GENERICO];

  return extracted;
}

export function hasPrivilegedCapRole(roles) {
  const list = Array.isArray(roles) ? roles : [];
  return list.some((r) => PRIVILEGED_CAP_ROLES.has(r));
}

/** Auditor LPA (CAP_Generico o sin rol privilegiado). */
export function isAuditorLpaSinRolesCap(access) {
  return (
    !access.isCapAdmin && !access.isCapMantenimiento && !access.isCapProcesos
  );
}

export const CAP_ACCESS_STORAGE_KEY = "capAccess";

/** Área principal para guards de ruta (localStorage). */
export function resolveCapArea(access) {
  if (access.isCapAdmin) return "admin";
  if (access.isCapMantenimiento && !access.isCapProcesos) return "mantenimiento";
  if (access.isCapProcesos && !access.isCapMantenimiento) return "procesos";
  if (access.isCapMantenimiento && access.isCapProcesos) return "mixto";
  return "auditor";
}

export function buildCapAccess(roles) {
  const set = new Set(roles);
  const isCapAdmin = set.has(CAP_ROLE_ADMIN);
  const isCapMantenimiento = set.has(CAP_ROLE_MANTENIMIENTO);
  const isCapProcesos = set.has(CAP_ROLE_PROCESOS);
  const isCapGenerico = set.has(CAP_ROLE_GENERICO);

  const access = {
    roles: [...set],
    isCapAdmin,
    isCapMantenimiento,
    isCapProcesos,
    isCapGenerico,
    canCalidadAdmin: isCapAdmin,
    canMantenimiento: isCapAdmin || isCapMantenimiento,
    canProcesos: isCapAdmin || isCapProcesos,
    /** Acceso al shell sin estar en tabla usuarios CAP (solo área Mant/Procesos). */
    bypassUsuarioCap: isCapAdmin || isCapMantenimiento || isCapProcesos,
  };
  return { ...access, capArea: resolveCapArea(access) };
}

export function persistCapAccessClient(access) {
  if (typeof window === "undefined") return;
  const normalized = buildCapAccess(access?.roles ?? []);
  try {
    localStorage.setItem(CAP_ACCESS_STORAGE_KEY, JSON.stringify(normalized));
    localStorage.setItem("capRoles", JSON.stringify(normalized.roles));
  } catch {
    /* ignore */
  }
}

export function readCapAccessClient() {
  if (typeof window === "undefined") {
    return buildCapAccess([]);
  }
  try {
    const raw = localStorage.getItem(CAP_ACCESS_STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.roles)) {
        return buildCapAccess(data.roles);
      }
    }
  } catch {
    /* fallback */
  }
  try {
    const raw = localStorage.getItem("capRoles");
    const roles = raw ? JSON.parse(raw) : [];
    return buildCapAccess(Array.isArray(roles) ? roles : []);
  } catch {
    return buildCapAccess([]);
  }
}

/** Solo Mantenimiento (sin Procesos ni Admin). */
export function isSoloMantenimientoCap(access) {
  return (
    access.isCapMantenimiento && !access.isCapAdmin && !access.isCapProcesos
  );
}

/** Solo Procesos (sin Mantenimiento ni Admin). */
export function isSoloProcesosCap(access) {
  return access.isCapProcesos && !access.isCapAdmin && !access.isCapMantenimiento;
}

export function defaultHomeForAccess(access, isAdminLegacy) {
  if (access.isCapAdmin || isAdminLegacy) return "/dashboard";
  if (access.isCapMantenimiento && !access.isCapProcesos) {
    return "/dashboard/mantenimiento/tickets";
  }
  if (access.isCapProcesos && !access.isCapMantenimiento) {
    return "/dashboard/procesos/tickets";
  }
  if (access.isCapMantenimiento && access.isCapProcesos) {
    return "/dashboard/mantenimiento/tickets";
  }
  return "/dashboard/auditorias";
}
