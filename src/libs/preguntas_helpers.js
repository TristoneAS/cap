import { capDb } from "@/libs/cap_db";

function parseIdSubAreas(body) {
  if (Array.isArray(body.id_sub_areas) && body.id_sub_areas.length > 0) {
    return [
      ...new Set(
        body.id_sub_areas
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];
  }
  const single = Number(body.id_sub_area);
  return Number.isFinite(single) && single > 0 ? [single] : [];
}

export async function validarRelacionesPregunta(body) {
  const id_tipo_auditoria = Number(body.id_tipo_auditoria);
  const id_area = Number(body.id_area);
  const id_tipo_nc = Number(body.id_tipo_nc);
  const texto = String(body.texto ?? "").trim();
  const id_sub_areas = parseIdSubAreas(body);

  if (!id_tipo_auditoria || !id_area || !id_tipo_nc || !texto || !id_sub_areas.length) {
    return {
      error:
        "Tipo de auditoría, área, al menos una sub área, tipo de no conformidad y texto son requeridos",
      status: 400,
    };
  }

  const [tipo] = await capDb.query(
    "SELECT id_tipo_auditoria FROM tipos_auditoria WHERE id_tipo_auditoria = ? AND estado = 'activo'",
    [id_tipo_auditoria],
  );
  if (!tipo.length) return { error: "Tipo de auditoría no válido", status: 400 };

  const [area] = await capDb.query(
    "SELECT id_area FROM areas WHERE id_area = ? AND estado = 'activo'",
    [id_area],
  );
  if (!area.length) return { error: "Área no válida", status: 400 };

  const placeholders = id_sub_areas.map(() => "?").join(", ");
  const [subAreas] = await capDb.query(
    `SELECT id_sub_area FROM sub_areas
     WHERE id_sub_area IN (${placeholders}) AND id_area = ? AND estado = 'activo'`,
    [...id_sub_areas, id_area],
  );
  if (subAreas.length !== id_sub_areas.length) {
    return {
      error: "Una o más sub áreas no pertenecen al área seleccionada",
      status: 400,
    };
  }

  const [tipoNc] = await capDb.query(
    "SELECT id_tipo_nc FROM tipos_no_conformidad WHERE id_tipo_nc = ? AND estado = 'activo'",
    [id_tipo_nc],
  );
  if (!tipoNc.length) return { error: "Tipo de no conformidad no válido", status: 400 };

  return {
    data: {
      id_tipo_auditoria,
      id_area,
      id_sub_areas,
      id_sub_area: id_sub_areas[0],
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
