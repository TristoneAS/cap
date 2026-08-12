import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idArea = Number(searchParams.get("id_area"));
    const idSubArea = Number(searchParams.get("id_sub_area"));

    if (!idArea || !idSubArea) {
      return jsonError("id_area e id_sub_area son requeridos", 400);
    }

    const [rows] = await capDb.query(
      `SELECT DISTINCT t.id_tipo_auditoria, t.nombre, t.descripcion
       FROM preguntas p
       INNER JOIN pregunta_alcance pa
         ON pa.id_pregunta = p.id_pregunta AND pa.estado = 'activo'
       INNER JOIN tipos_auditoria t
         ON t.id_tipo_auditoria = p.id_tipo_auditoria AND t.estado = 'activo'
       WHERE p.estado = 'activo'
         AND pa.id_area = ?
         AND pa.id_sub_area = ?
       ORDER BY t.nombre ASC`,
      [idArea, idSubArea],
    );

    return jsonOk(rows);
  } catch (error) {
    return jsonError("Error al consultar tipos disponibles", 500, error.message);
  }
}
