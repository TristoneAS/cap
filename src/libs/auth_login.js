/**
 * Validación de respuesta del servidor LDAP (SYSTEMVDOCS/AUTHENTICATE).
 * Fail-closed: solo entra si el JSON trae `authenticated: true`.
 */
export function parseAuthenticatedFlag(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value == null) return false;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0" || normalized === "") {
    return false;
  }
  return false;
}

export function isAuthResponseOk(response, authData) {
  if (!response?.ok) return false;
  return parseAuthenticatedFlag(authData?.authenticated);
}

export function mensajeErrorAuth(authData) {
  const raw = String(
    authData?.message || authData?.error || authData?.Message || "",
  ).trim();
  const lower = raw.toLowerCase();

  if (
    lower.includes("data 775") ||
    lower.includes("account locked") ||
    lower.includes("locked out")
  ) {
    return "Tu cuenta está bloqueada. Contacta a soporte.";
  }
  if (lower.includes("data 532") || lower.includes("password expired")) {
    return "Tu contraseña ha expirado. Debes cambiarla.";
  }
  if (
    lower.includes("data 533") ||
    lower.includes("data 701") ||
    lower.includes("account disabled") ||
    lower.includes("account expired")
  ) {
    return "Tu cuenta no está activa. Contacta a soporte.";
  }

  if (
    !raw ||
    lower.includes("ldaperr") ||
    lower.includes("dsid-") ||
    lower.includes("acceptsecuritycontext") ||
    lower.includes("unauthorized") ||
    lower.includes("invalid") ||
    lower.includes("credential")
  ) {
    return "Usuario o contraseña incorrectos";
  }

  return "Usuario o contraseña incorrectos";
}
