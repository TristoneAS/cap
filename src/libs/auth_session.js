export const SESSION_COOKIE_NAME = "pdc_session";
export const SESSION_COOKIE_VALUE = "authenticated";
/** Duración de sesión (cookie + localStorage). */
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export const AUTH_STORAGE_KEYS = [
  "infoUser",
  "user",
  "isAuthenticated",
  "isAdmin",
  "usuario",
  "sessionExpiresAt",
  "capUser",
];

export function getSessionExpiresAt(fromMs = Date.now()) {
  return fromMs + SESSION_DURATION_MS;
}

export function setSessionCookieClient(expiresAt) {
  if (typeof document === "undefined") return;
  const expires = new Date(expiresAt).toUTCString();
  document.cookie = `${SESSION_COOKIE_NAME}=${SESSION_COOKIE_VALUE}; expires=${expires}; path=/; SameSite=Lax`;
}

export function clearSessionCookieClient() {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function hasSessionCookieClient() {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some(
      (part) =>
        part.trim() ===
        `${SESSION_COOKIE_NAME}=${SESSION_COOKIE_VALUE}`,
    );
}

export function clearAuthStorageClient() {
  if (typeof window !== "undefined") {
    AUTH_STORAGE_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    });
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  }
  clearSessionCookieClient();
}

export function isAuthenticatedClient() {
  if (typeof window === "undefined") return false;

  if (!hasSessionCookieClient()) {
    return false;
  }

  if (localStorage.getItem("isAuthenticated") !== "true") {
    return false;
  }

  const expRaw = localStorage.getItem("sessionExpiresAt");
  if (expRaw) {
    const exp = Number(expRaw);
    if (!Number.isNaN(exp) && Date.now() > exp) {
      clearAuthStorageClient();
      return false;
    }
  }

  return true;
}

export function syncSessionCookieFromStorage() {
  if (typeof window === "undefined") return;
  const expRaw = localStorage.getItem("sessionExpiresAt");
  const exp = expRaw ? Number(expRaw) : NaN;
  if (!Number.isNaN(exp) && exp > Date.now()) {
    setSessionCookieClient(exp);
  }
}

/**
 * Ruta interna segura tras login (solo rutas bajo /dashboard).
 * @param {string|null|undefined} path
 * @returns {string}
 */
export function getSafeRedirectPath(path) {
  const raw = String(path ?? "").trim();
  if (!raw || !raw.startsWith("/dashboard") || raw.startsWith("//")) {
    return "/dashboard";
  }
  try {
    const url = new URL(raw, "http://localhost");
    if (
      !url.pathname.startsWith("/dashboard") ||
      url.pathname.startsWith("//")
    ) {
      return "/dashboard";
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "/dashboard";
  }
}
