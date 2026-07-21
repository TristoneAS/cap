/**
 * Normaliza filas de del_empleados (columnas varían por instalación).
 */
export function mapEmpleadoRow(row) {
  if (!row) return null;

  const empNombre = String(row.emp_nombre ?? "").trim();
  const paterno = String(
    row.emp_apellido_paterno ?? row.emp_paterno ?? "",
  ).trim();
  const materno = String(
    row.emp_apellido_materno ?? row.emp_materno ?? "",
  ).trim();

  return {
    emp_id: row.emp_id,
    emp_nombre: empNombre,
    emp_apellido_paterno: paterno,
    emp_apellido_materno: materno,
    emp_alias: row.emp_alias ?? "",
    emp_correo: row.emp_correo ?? null,
    emp_area: row.emp_area ?? null,
    emp_activo: row.emp_activo,
    emp_id_jefe: row.emp_id_jefe ?? null,
  };
}

export function nombreCompletoEmpleado(row) {
  const mapped = mapEmpleadoRow(row);
  if (!mapped) return "";
  const partes = [
    mapped.emp_nombre,
    mapped.emp_apellido_paterno,
    mapped.emp_apellido_materno,
  ].filter(Boolean);
  return partes.join(" ").replace(/\s+/g, " ").trim();
}
