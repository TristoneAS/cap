import { empleados } from "@/libs/empleados";
import { capDb } from "@/libs/cap_db";
import { mapEmpleadoRow, nombreCompletoEmpleado } from "@/libs/empleado_mapper";
import { jsonError, jsonOk } from "@/libs/api_helpers";
import { procesarVencimientosAuditorias } from "@/libs/auditoria_vencimiento";
import { ESTADOS_AUDITORIA_ABIERTA } from "@/libs/auditoria_fechas";

function resolvePeriodoFilter(searchParams) {
  const periodoMes = String(searchParams.get("periodo_mes") || "").trim();
  const periodoAnio = String(searchParams.get("periodo_anio") || "").trim();
  if (/^\d{4}-\d{2}$/.test(periodoMes)) {
    return { sql: "aud.periodo_mes = ?", params: [periodoMes], label: periodoMes };
  }
  if (/^\d{4}$/.test(periodoAnio)) {
    return {
      sql: "aud.periodo_mes LIKE ?",
      params: [`${periodoAnio}-%`],
      label: periodoAnio,
    };
  }
  const d = new Date();
  const cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return { sql: "aud.periodo_mes = ?", params: [cur], label: cur };
}

/**
 * Subordinados del jefe (emp_id_jefe) con auditorías aún no completadas.
 * Query: emp_id_jefe, periodo_mes (YYYY-MM) o periodo_anio (YYYY). Default: año actual.
 */
export async function GET(request) {
  try {
    await procesarVencimientosAuditorias().catch(() => {});

    const { searchParams } = new URL(request.url);
    const empIdJefe = String(searchParams.get("emp_id_jefe") || "").trim();
    const periodoFilter = resolvePeriodoFilter(searchParams);

    if (!empIdJefe) {
      return jsonError("emp_id_jefe es requerido", 400);
    }

    let subordinadosRows;
    try {
      [subordinadosRows] = await empleados.query(
        `SELECT * FROM del_empleados
         WHERE CAST(emp_id_jefe AS CHAR) = ?
           AND emp_activo = 1
         ORDER BY emp_nombre ASC`,
        [empIdJefe],
      );
    } catch {
      try {
        [subordinadosRows] = await empleados.query(
          `SELECT * FROM del_empleados
           WHERE CAST(emp_id_jefe AS CHAR) = ?
           ORDER BY emp_nombre ASC`,
          [empIdJefe],
        );
      } catch (error) {
        return jsonError(
          "Error al consultar subordinados (verifique emp_id_jefe en del_empleados)",
          500,
          error.message,
        );
      }
    }

    const subordinados = (subordinadosRows || []).map((row) => {
      const mapped = mapEmpleadoRow(row);
      return {
        ...mapped,
        nombre_completo: nombreCompletoEmpleado(row) || mapped.emp_nombre,
      };
    });

    if (!subordinados.length) {
      return jsonOk({
        periodo: periodoFilter.label,
        emp_id_jefe: empIdJefe,
        equipo: [],
        total_personas: 0,
        total_auditorias: 0,
      });
    }

    const ids = subordinados.map((s) => String(s.emp_id));
    const placeholders = ids.map(() => "?").join(", ");

    const [auditorias] = await capDb.query(
      `SELECT aud.id_auditoria, aud.emp_id, aud.emp_nombre, aud.periodo_mes,
              aud.turno, aud.estado, aud.fecha_programada,
              a.nombre AS area_nombre, sa.nombre AS sub_area_nombre,
              t.nombre AS tipo_nombre
       FROM auditorias aud
       INNER JOIN areas a ON a.id_area = aud.id_area
       INNER JOIN sub_areas sa ON sa.id_sub_area = aud.id_sub_area
       INNER JOIN tipos_auditoria t ON t.id_tipo_auditoria = aud.id_tipo_auditoria
       WHERE ${periodoFilter.sql}
         AND aud.estado IN (${ESTADOS_AUDITORIA_ABIERTA.map(() => "?").join(", ")})
         AND CAST(aud.emp_id AS CHAR) IN (${placeholders})
       ORDER BY a.nombre ASC, sa.nombre ASC, aud.turno ASC`,
      [...periodoFilter.params, ...ESTADOS_AUDITORIA_ABIERTA, ...ids],
    );

    const audsByEmp = new Map();
    for (const aud of auditorias) {
      const key = String(aud.emp_id);
      if (!audsByEmp.has(key)) audsByEmp.set(key, []);
      audsByEmp.get(key).push(aud);
    }

    const equipo = subordinados
      .map((emp) => {
        const pendientes = audsByEmp.get(String(emp.emp_id)) || [];
        return {
          ...emp,
          auditorias_pendientes: pendientes,
          total_pendientes: pendientes.length,
        };
      })
      .filter((emp) => emp.total_pendientes > 0);

    const total_auditorias = equipo.reduce(
      (acc, e) => acc + e.total_pendientes,
      0,
    );

    return jsonOk({
      periodo: periodoFilter.label,
      emp_id_jefe: empIdJefe,
      equipo,
      total_personas: equipo.length,
      total_auditorias,
      total_subordinados: subordinados.length,
    });
  } catch (error) {
    return jsonError("Error al consultar equipo del jefe", 500, error.message);
  }
}
