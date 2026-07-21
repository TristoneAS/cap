import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";
import { calcularPorcentajeCumplimiento } from "@/libs/auditoria_score";
import { periodoMesPlanta } from "@/libs/auditoria_fechas";
import { procesarVencimientosAuditorias } from "@/libs/auditoria_vencimiento";
import { generarAuditoriasAutomatico } from "@/libs/auditoria_generacion_automatica";
import { generarAuditoriasMes } from "@/libs/generar_auditorias";

/** Filtro por periodo_mes (YYYY-MM) o periodo_anio (YYYY). Sin params: mes actual. */
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
  const cur = periodoMesPlanta();
  return { sql: "aud.periodo_mes = ?", params: [cur], label: cur };
}

export async function GET(request) {
  try {
    await generarAuditoriasAutomatico().catch(() => {});
    await procesarVencimientosAuditorias().catch(() => {});

    const { searchParams } = new URL(request.url);
    const periodoFilter = resolvePeriodoFilter(searchParams);
    const empId = searchParams.get("emp_id");

    let sql = `
      SELECT aud.id_auditoria, aud.id_area, aud.id_sub_area, aud.id_tipo_auditoria,
             aud.periodo_mes, aud.turno, aud.estado, aud.fecha_programada,
             aud.emp_id, aud.emp_nombre,
             a.nombre AS area_nombre, sa.nombre AS sub_area_nombre,
             t.nombre AS tipo_nombre,
             (
               SELECT COUNT(*)
               FROM auditoria_respuestas ar
               WHERE ar.id_auditoria = aud.id_auditoria
                 AND ar.cumple IS NOT NULL
             ) AS respondidas,
             (
               SELECT COUNT(*)
               FROM auditoria_respuestas ar
               WHERE ar.id_auditoria = aud.id_auditoria
                 AND ar.cumple = 'si'
             ) AS respuestas_si,
             CASE
               WHEN aud.estado IN ('completada', 'cancelada') THEN (
                 SELECT COUNT(*)
                 FROM auditoria_respuestas ar
                 WHERE ar.id_auditoria = aud.id_auditoria
                   AND ar.cumple IS NOT NULL
               )
               ELSE (
                 SELECT COUNT(*)
                 FROM preguntas p
                 WHERE p.estado = 'activo'
                   AND p.id_tipo_auditoria = aud.id_tipo_auditoria
                   AND p.id_area = aud.id_area
                   AND p.id_sub_area = aud.id_sub_area
               )
             END AS total_preguntas
      FROM auditorias aud
      INNER JOIN areas a ON a.id_area = aud.id_area
      INNER JOIN sub_areas sa ON sa.id_sub_area = aud.id_sub_area
      INNER JOIN tipos_auditoria t ON t.id_tipo_auditoria = aud.id_tipo_auditoria
      WHERE ${periodoFilter.sql}
    `;
    const params = [...periodoFilter.params];

    if (empId) {
      sql += " AND aud.emp_id = ?";
      params.push(empId);
    }

    sql += " ORDER BY a.nombre ASC, sa.nombre ASC, aud.turno ASC, t.nombre ASC, aud.emp_nombre ASC";

    const [rows] = await capDb.query(sql, params);
    return jsonOk(
      rows.map((r) => {
        const total_preguntas = Number(r.total_preguntas || 0);
        const respondidas = Number(r.respondidas || 0);
        const respuestas_si = Number(r.respuestas_si || 0);
        const porcentaje =
          r.estado === "completada" || respondidas >= total_preguntas
            ? calcularPorcentajeCumplimiento({
                totalPreguntas: total_preguntas,
                respuestasSi: respuestas_si,
              })
            : null;
        return {
          ...r,
          total_preguntas,
          respondidas,
          respuestas_si,
          porcentaje,
        };
      }),
    );
  } catch (error) {
    return jsonError("Error al consultar auditorías", 500, error.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const periodo_mes = String(body.periodo_mes ?? periodoMesPlanta()).trim();
    const forzar = body.forzar === true || body.forzar === "true";

    const resultado = await generarAuditoriasMes(periodo_mes, { forzar, automatica: false });

    if (!resultado.ok) {
      return jsonError(resultado.error, resultado.status || 400, resultado.data);
    }

    return jsonOk(resultado.data, resultado.message);
  } catch (error) {
    return jsonError("Error al generar auditorías", 500, error.message);
  }
}
