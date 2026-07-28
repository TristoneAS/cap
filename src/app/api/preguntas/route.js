import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";
import {
  PREGUNTA_MASTER_SELECT,
  buildAlcanceResumen,
  fetchAlcancePorPreguntas,
  reemplazarAlcancePregunta,
  validarAlcancePregunta,
} from "@/libs/preguntas_helpers";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idTipo = searchParams.get("id_tipo_auditoria");
    const idArea = searchParams.get("id_area");
    const idSubArea = searchParams.get("id_sub_area");

    let sql = PREGUNTA_MASTER_SELECT;
    const params = [];

    if (idTipo) {
      sql += " AND p.id_tipo_auditoria = ?";
      params.push(idTipo);
    }

    sql += " ORDER BY t.nombre ASC, p.id_pregunta ASC";

    const [rows] = await capDb.query(sql, params);
    const ids = rows.map((r) => r.id_pregunta);
    const alcanceMap = await fetchAlcancePorPreguntas(ids);

    let data = rows.map((row) => {
      const alcance = alcanceMap.get(row.id_pregunta) || [];
      return {
        ...row,
        alcance,
        alcance_resumen: buildAlcanceResumen(alcance),
        total_sub_areas: alcance.length,
      };
    });

    if (idArea || idSubArea) {
      data = data.filter((row) =>
        row.alcance.some((a) => {
          if (idArea && String(a.id_area) !== String(idArea)) return false;
          if (idSubArea && String(a.id_sub_area) !== String(idSubArea)) {
            return false;
          }
          return true;
        }),
      );
    }

    return jsonOk(data);
  } catch (error) {
    return jsonError("Error al consultar preguntas", 500, error.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const validacion = await validarAlcancePregunta(body);
    if (validacion.error) return jsonError(validacion.error, validacion.status);

    const { id_tipo_auditoria, id_tipo_nc, texto, pares } = validacion.data;

    const [result] = await capDb.query(
      `INSERT INTO preguntas (id_tipo_auditoria, id_tipo_nc, texto)
       VALUES (?, ?, ?)`,
      [id_tipo_auditoria, id_tipo_nc, texto],
    );

    const id_pregunta = result.insertId;
    await reemplazarAlcancePregunta(id_pregunta, pares);

    return jsonOk(
      {
        id_pregunta,
        id_tipo_auditoria,
        id_tipo_nc,
        texto,
        alcance: pares,
        total_sub_areas: pares.length,
      },
      pares.length === 1
        ? "Pregunta creada"
        : `Pregunta creada con alcance en ${pares.length} sub áreas`,
      201,
    );
  } catch (error) {
    return jsonError("Error al crear pregunta", 500, error.message);
  }
}
