/** Acceso a una auditoría: admin o auditor asignado (emp_id). */
export function assertAuditoriaAccess(aud, { empId, isAdmin }) {
  if (isAdmin) {
    return { ok: true };
  }
  const id = String(empId ?? "").trim();
  if (!id) {
    return {
      ok: false,
      status: 400,
      error: "emp_id es requerido",
    };
  }
  if (String(aud.emp_id) !== id) {
    return {
      ok: false,
      status: 403,
      error: "No tiene permiso para acceder a esta auditoría",
    };
  }
  return { ok: true };
}

export function parseIsAdminFlag(searchParams) {
  return (
    searchParams.get("is_admin") === "true" ||
    searchParams.get("is_admin") === "1"
  );
}
