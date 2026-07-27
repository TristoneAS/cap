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

export async function validarRelacionesPregunta(body) {
  const id_tipo_auditoria = Number(body.id_tipo_auditoria);
  const id_tipo_nc = Number(body.id_tipo_nc);
  const texto = String(body.texto ?? "").trim();
  const id_areas = parseIdAreas(body);
  const id_sub_areas = parseIdSubAreas(body);

  if (
    !id_tipo_auditoria ||
    !id_areas.length ||
    !id_tipo_nc ||
    !texto ||
    !id_sub_areas.length
  ) {
    return {
      error:
        "Tipo de auditoría, al menos un área, al menos una sub área, tipo de no conformidad y texto son requeridos",
      status: 400,
    };
  }

  const [tipo] = await capDb.query(
    "SELECT id_tipo_auditoria FROM tipos_auditoria WHERE id_tipo_auditoria = ? AND estado = 'activo'",
    [id_tipo_auditoria],
  );
  if (!tipo.length) return { error: "Tipo de auditoría no válido", status: 400 };

  const areaPlaceholders = id_areas.map(() => "?").join(", ");
  const [areasRows] = await capDb.query(
    `SELECT id_area FROM areas
     WHERE id_area IN (${areaPlaceholders}) AND estado = 'activo'`,
    id_areas,
  );
  if (areasRows.length !== id_areas.length) {
    return { error: "Una o más áreas no son válidas", status: 400 };
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

  const areaSet = new Set(id_areas);
  for (const sub of subRows) {
    if (!areaSet.has(sub.id_area)) {
      return {
        error: "Una o más sub áreas no pertenecen a las áreas seleccionadas",
        status: 400,
      };
    }
  }

  if (id_areas.length === 1) {
    const [subAreasUnArea] = await capDb.query(
      `SELECT id_sub_area FROM sub_areas
       WHERE id_sub_area IN (${subPlaceholders}) AND id_area = ? AND estado = 'activo'`,
      [...id_sub_areas, id_areas[0]],
    );
    if (subAreasUnArea.length !== id_sub_areas.length) {
      return {
        error: "Una o más sub áreas no pertenecen al área seleccionada",
        status: 400,
      };
    }
  } else {
    const [todasSubs] = await capDb.query(
      `SELECT id_sub_area FROM sub_areas
       WHERE id_area IN (${areaPlaceholders}) AND estado = 'activo'`,
      id_areas,
    );
    const esperadas = new Set(todasSubs.map((r) => r.id_sub_area));
    const recibidas = new Set(id_sub_areas);
    if (
      esperadas.size !== recibidas.size ||
      ![...esperadas].every((id) => recibidas.has(id))
    ) {
      return {
        error:
          "Al seleccionar varias áreas debe incluir todas sus sub áreas activas",
        status: 400,
      };
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
      id_area: id_areas[0],
      id_areas,
      id_sub_areas,
      id_sub_area: id_sub_areas[0],
      pares,
      id_tipo_nc,
      texto,
    },
  };
}

export const PREGUNTAS_SELECT = `
  SELECT p.id_pregunta, p.id_tipo_auditoria, p.id_area, p.id_sub_area, p.id_tipo_nc,
         p.texto, p.estado,
         t.nombre AS tipo_nombre,
         a.nombre AS area_nombre,
         sa.nombre AS sub_area_nombre,
         nc.nombre AS tipo_nc_nombre
  FROM preguntas p
  INNER JOIN tipos_auditoria t ON t.id_tipo_auditoria = p.id_tipo_auditoria
  INNER JOIN areas a ON a.id_area = p.id_area
  INNER JOIN sub_areas sa ON sa.id_sub_area = p.id_sub_area
  INNER JOIN tipos_no_conformidad nc ON nc.id_tipo_nc = p.id_tipo_nc
  WHERE p.estado = 'activo'
    AND t.estado = 'activo'
    AND a.estado = 'activo'
    AND sa.estado = 'activo'
    AND nc.estado = 'activo'
`;
