import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";
import { PREGUNTAS_SELECT, validarRelacionesPregunta } from "@/libs/preguntas_helpers";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idTipo = searchParams.get("id_tipo_auditoria");
    const idArea = searchParams.get("id_area");
    const idSubArea = searchParams.get("id_sub_area");

    let sql = PREGUNTAS_SELECT;
    const params = [];

    if (idTipo) {
      sql += " AND p.id_tipo_auditoria = ?";
      params.push(idTipo);
    }
    if (idArea) {
      sql += " AND p.id_area = ?";
      params.push(idArea);
    }
    if (idSubArea) {
      sql += " AND p.id_sub_area = ?";
      params.push(idSubArea);
    }

    sql += " ORDER BY a.nombre ASC, sa.nombre ASC, t.nombre ASC, p.id_pregunta ASC";

    const [rows] = await capDb.query(sql, params);
    return jsonOk(rows);
  } catch (error) {
    return jsonError("Error al consultar preguntas", 500, error.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const validacion = await validarRelacionesPregunta(body);
    if (validacion.error) return jsonError(validacion.error, validacion.status);

    const { id_tipo_auditoria, id_area, id_sub_areas, id_tipo_nc, texto } =
      validacion.data;

    const values = id_sub_areas.map(() => "(?, ?, ?, ?, ?)").join(", ");
    const params = id_sub_areas.flatMap((id_sub_area) => [
      id_tipo_auditoria,
      id_area,
      id_sub_area,
      id_tipo_nc,
      texto,
    ]);

    const [result] = await capDb.query(
      `INSERT INTO preguntas
       (id_tipo_auditoria, id_area, id_sub_area, id_tipo_nc, texto)
       VALUES ${values}`,
      params,
    );

    const creadas = id_sub_areas.length;
    return jsonOk(
      {
        id_pregunta: result.insertId,
        creadas,
        id_tipo_auditoria,
        id_area,
        id_sub_areas,
        id_tipo_nc,
        texto,
      },
      creadas === 1
        ? "Pregunta creada"
        : `Se crearon ${creadas} preguntas (una por sub área)`,
      201,
    );
  } catch (error) {
    return jsonError("Error al crear pregunta", 500, error.message);
  }
}
