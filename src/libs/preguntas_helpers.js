import { capDb } from "@/libs/cap_db";

function parseIdList(rawList, singleKey) {
  if (Array.isArray(rawList) && rawList.length > 0) {
    return [
      ...new Set(
        rawList
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];
  }
  const single = Number(singleKey);
  return Number.isFinite(single) && single > 0 ? [single] : [];
}

function parseIdAreas(body) {
  return parseIdList(body.id_areas, body.id_area);
}

function parseIdSubAreas(body) {
  return parseIdList(body.id_sub_areas, body.id_sub_area);
}

/** SQL base: pregunta maestra (sin área/sub área). */
export const PREGUNTA_MASTER_SELECT = `
  SELECT p.id_pregunta, p.id_tipo_auditoria, p.id_tipo_nc, p.texto, p.estado,
         t.nombre AS tipo_nombre,
         nc.nombre AS tipo_nc_nombre
  FROM preguntas p
  INNER JOIN tipos_auditoria t ON t.id_tipo_auditoria = p.id_tipo_auditoria
  INNER JOIN tipos_no_conformidad nc ON nc.id_tipo_nc = p.id_tipo_nc
  WHERE p.estado = 'activo'
    AND t.estado = 'activo'
    AND nc.estado = 'activo'
`;

/** Checklist vigente para una auditoría (área + sub área + tipo). */
export const PREGUNTAS_CHECKLIST_SELECT = `
  SELECT p.id_pregunta, p.id_tipo_auditoria, p.id_tipo_nc, p.texto, p.estado,
         t.nombre AS tipo_nombre,
         nc.nombre AS tipo_nc_nombre,
         pa.id_area, pa.id_sub_area,
         a.nombre AS area_nombre,
         sa.nombre AS sub_area_nombre
  FROM preguntas p
  INNER JOIN pregunta_alcance pa
    ON pa.id_pregunta = p.id_pregunta AND pa.estado = 'activo'
  INNER JOIN areas a ON a.id_area = pa.id_area AND a.estado = 'activo'
  INNER JOIN sub_areas sa ON sa.id_sub_area = pa.id_sub_area AND sa.estado = 'activo'
  INNER JOIN tipos_auditoria t ON t.id_tipo_auditoria = p.id_tipo_auditoria
  INNER JOIN tipos_no_conformidad nc ON nc.id_tipo_nc = p.id_tipo_nc
  WHERE p.estado = 'activo'
    AND t.estado = 'activo'
    AND nc.estado = 'activo'
`;

/** @deprecated usar PREGUNTA_MASTER_SELECT o PREGUNTAS_CHECKLIST_SELECT */
export const PREGUNTAS_SELECT = PREGUNTAS_CHECKLIST_SELECT;

export const ALCANCE_SELECT = `
  SELECT pa.id_alcance, pa.id_pregunta, pa.id_area, pa.id_sub_area,
         a.nombre AS area_nombre, sa.nombre AS sub_area_nombre
  FROM pregunta_alcance pa
  INNER JOIN areas a ON a.id_area = pa.id_area
  INNER JOIN sub_areas sa ON sa.id_sub_area = pa.id_sub_area
  WHERE pa.estado = 'activo'
    AND a.estado = 'activo'
    AND sa.estado = 'activo'
`;

export function buildAlcanceResumen(alcance = []) {
  if (!alcance.length) return "Sin alcance";
  const byArea = new Map();
  for (const row of alcance) {
    const area = row.area_nombre || `Área ${row.id_area}`;
    if (!byArea.has(area)) byArea.set(area, []);
    byArea.get(area).push(row.sub_area_nombre || `Sub ${row.id_sub_area}`);
  }
  return [...byArea.entries()]
    .map(([area, subs]) => `${area}: ${subs.join(", ")}`)
    .join(" · ");
}

export async function fetchAlcancePorPreguntas(ids = []) {
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => "?").join(", ");
  const [rows] = await capDb.query(
    `${ALCANCE_SELECT} AND pa.id_pregunta IN (${placeholders})
     ORDER BY a.nombre ASC, sa.nombre ASC`,
    ids,
  );
  const map = new Map();
  for (const row of rows) {
    const key = row.id_pregunta;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

export async function validarAlcancePregunta(body) {
  const id_tipo_auditoria = Number(body.id_tipo_auditoria);
  const id_tipo_nc = Number(body.id_tipo_nc);
  const texto = String(body.texto ?? "").trim();
  const id_areas = parseIdAreas(body);
  const id_sub_areas = parseIdSubAreas(body);

  if (!id_tipo_auditoria || !id_tipo_nc || !texto || !id_sub_areas.length) {
    return {
      error:
        "Tipo de auditoría, al menos una sub área, tipo de no conformidad y texto son requeridos",
      status: 400,
    };
  }

  const [tipo] = await capDb.query(
    "SELECT id_tipo_auditoria FROM tipos_auditoria WHERE id_tipo_auditoria = ? AND estado = 'activo'",
    [id_tipo_auditoria],
  );
  if (!tipo.length) return { error: "Tipo de auditoría no válido", status: 400 };

  if (id_areas.length) {
    const areaPlaceholders = id_areas.map(() => "?").join(", ");
    const [areasRows] = await capDb.query(
      `SELECT id_area FROM areas
       WHERE id_area IN (${areaPlaceholders}) AND estado = 'activo'`,
      id_areas,
    );
    if (areasRows.length !== id_areas.length) {
      return { error: "Una o más áreas no son válidas", status: 400 };
    }
  }

  const subPlaceholders = id_sub_areas.map(() => "?").join(", ");
  const [subRows] = await capDb.query(
    `SELECT id_sub_area, id_area FROM sub_areas
     WHERE id_sub_area IN (${subPlaceholders}) AND estado = 'activo'`,
    id_sub_areas,
  );
  if (subRows.length !== id_sub_areas.length) {
    return { error: "Una o más sub áreas no son válidas", status: 400 };
  }

    if (id_areas.length) {
      const areaSet = new Set(id_areas);
      for (const sub of subRows) {
        if (!areaSet.has(sub.id_area)) {
          return {
            error: "Una o más sub áreas no pertenecen a las áreas seleccionadas",
            status: 400,
          };
        }
      }
    }

  const [tipoNc] = await capDb.query(
    "SELECT id_tipo_nc FROM tipos_no_conformidad WHERE id_tipo_nc = ? AND estado = 'activo'",
    [id_tipo_nc],
  );
  if (!tipoNc.length) return { error: "Tipo de no conformidad no válido", status: 400 };

  const pares = subRows.map((sub) => ({
    id_area: sub.id_area,
    id_sub_area: sub.id_sub_area,
  }));

  return {
    data: {
      id_tipo_auditoria,
      id_tipo_nc,
      texto,
      id_areas,
      id_sub_areas,
      pares,
    },
  };
}

export async function reemplazarAlcancePregunta(idPregunta, pares) {
  await capDb.query(
    `UPDATE pregunta_alcance SET estado = 'inactivo' WHERE id_pregunta = ?`,
    [idPregunta],
  );

  if (!pares.length) return;

  const values = pares.map(() => "(?, ?, ?, 'activo')").join(", ");
  const params = pares.flatMap(({ id_area, id_sub_area }) => [
    idPregunta,
    id_area,
    id_sub_area,
  ]);

  await capDb.query(
    `INSERT INTO pregunta_alcance (id_pregunta, id_area, id_sub_area, estado)
     VALUES ${values}
     ON DUPLICATE KEY UPDATE estado = 'activo'`,
    params,
  );
}

/** @deprecated usar validarAlcancePregunta */
export const validarRelacionesPregunta = validarAlcancePregunta;
