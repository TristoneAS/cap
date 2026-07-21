import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";

function currentPeriod() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

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
  const cur = currentPeriod();
  return { sql: "aud.periodo_mes = ?", params: [cur], label: cur };
}

/**
 * Agrega no conformidades (respuestas "No" con tipo NC) del periodo.
 * Query: periodo_mes | periodo_anio, id_area?, id_sub_area?, limit?, detalle=1?
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const periodoFilter = resolvePeriodoFilter(searchParams);
    const idArea = searchParams.get("id_area");
    const idSubArea = searchParams.get("id_sub_area");
    const conDetalle = searchParams.get("detalle") === "1";
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 12, 1),
      50,
    );

    let sql = `
      SELECT nc.id_tipo_nc,
             nc.nombre,
             COUNT(*) AS total
      FROM auditoria_respuestas ar
      INNER JOIN auditorias aud ON aud.id_auditoria = ar.id_auditoria
      INNER JOIN tipos_no_conformidad nc ON nc.id_tipo_nc = ar.id_tipo_nc
      WHERE ${periodoFilter.sql}
        AND ar.cumple = 'no'
        AND ar.id_tipo_nc IS NOT NULL
    `;
    const params = [...periodoFilter.params];

    if (idArea) {
      sql += " AND aud.id_area = ?";
      params.push(Number(idArea));
    }
    if (idSubArea) {
      sql += " AND aud.id_sub_area = ?";
      params.push(Number(idSubArea));
    }

    sql += `
      GROUP BY nc.id_tipo_nc, nc.nombre
      ORDER BY total DESC, nc.nombre ASC
      LIMIT ?
    `;
    params.push(limit);

    const [rows] = await capDb.query(sql, params);
    const total = rows.reduce((acc, r) => acc + Number(r.total || 0), 0);

    const items = rows.map((r) => {
      const n = Number(r.total || 0);
      return {
        id_tipo_nc: r.id_tipo_nc,
        nombre: r.nombre,
        total: n,
        porcentaje: total > 0 ? Math.round((n / total) * 100) : 0,
      };
    });

    let detalles = [];
    if (conDetalle) {
      let detSql = `
        SELECT ar.id_respuesta, ar.hallazgo, ar.id_tipo_nc,
               nc.nombre AS tipo_nc_nombre,
               p.texto AS pregunta_texto,
               aud.id_auditoria, aud.turno, aud.emp_nombre, aud.periodo_mes,
               a.nombre AS area_nombre,
               sa.nombre AS sub_area_nombre,
               t.nombre AS tipo_auditoria_nombre
        FROM auditoria_respuestas ar
        INNER JOIN auditorias aud ON aud.id_auditoria = ar.id_auditoria
        INNER JOIN tipos_no_conformidad nc ON nc.id_tipo_nc = ar.id_tipo_nc
        LEFT JOIN preguntas p ON p.id_pregunta = ar.id_pregunta
        INNER JOIN areas a ON a.id_area = aud.id_area
        INNER JOIN sub_areas sa ON sa.id_sub_area = aud.id_sub_area
        INNER JOIN tipos_auditoria t ON t.id_tipo_auditoria = aud.id_tipo_auditoria
        WHERE ${periodoFilter.sql}
          AND ar.cumple = 'no'
          AND ar.id_tipo_nc IS NOT NULL
      `;
      const detParams = [...periodoFilter.params];
      if (idArea) {
        detSql += " AND aud.id_area = ?";
        detParams.push(Number(idArea));
      }
      if (idSubArea) {
        detSql += " AND aud.id_sub_area = ?";
        detParams.push(Number(idSubArea));
      }
      detSql += `
        ORDER BY nc.nombre ASC, aud.fecha_programada DESC, ar.id_respuesta DESC
        LIMIT 100
      `;
      const [detRows] = await capDb.query(detSql, detParams);
      detalles = detRows.map((r) => ({
        id_respuesta: r.id_respuesta,
        id_auditoria: r.id_auditoria,
        id_tipo_nc: r.id_tipo_nc,
        tipo_nc_nombre: r.tipo_nc_nombre,
        hallazgo: r.hallazgo || "",
        pregunta_texto: r.pregunta_texto || "",
        turno: r.turno,
        emp_nombre: r.emp_nombre,
        periodo_mes: r.periodo_mes,
        area_nombre: r.area_nombre,
        sub_area_nombre: r.sub_area_nombre,
        tipo_auditoria_nombre: r.tipo_auditoria_nombre,
      }));
    }

    return jsonOk({
      periodo_mes: periodoFilter.label,
      total,
      items,
      ...(conDetalle ? { detalles } : {}),
    });
  } catch (error) {
    return jsonError("Error al consultar no conformidades", 500, error.message);
  }
}
