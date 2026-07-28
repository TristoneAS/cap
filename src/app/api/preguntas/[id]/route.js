import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk, parseId, softDelete } from "@/libs/api_helpers";
import {
  PREGUNTA_MASTER_SELECT,
  buildAlcanceResumen,
  fetchAlcancePorPreguntas,
  reemplazarAlcancePregunta,
  validarAlcancePregunta,
} from "@/libs/preguntas_helpers";

export async function GET(_request, { params }) {
  try {
    const id = parseId(await params, "id");
    const [rows] = await capDb.query(
      `${PREGUNTA_MASTER_SELECT} AND p.id_pregunta = ?`,
      [id],
    );
    if (!rows.length) return jsonError("Pregunta no encontrada", 404);

    const alcanceMap = await fetchAlcancePorPreguntas([id]);
    const alcance = alcanceMap.get(Number(id)) || [];

    return jsonOk({
      ...rows[0],
      alcance,
      alcance_resumen: buildAlcanceResumen(alcance),
      total_sub_areas: alcance.length,
    });
  } catch (error) {
    return jsonError("Error al consultar pregunta", 500, error.message);
  }
}

export async function PUT(request, { params }) {
  try {
    const id = parseId(await params, "id");
    const body = await request.json();
    const validacion = await validarAlcancePregunta(body);
    if (validacion.error) return jsonError(validacion.error, validacion.status);

    const [existing] = await capDb.query(
      `SELECT id_pregunta FROM preguntas WHERE id_pregunta = ? AND estado = 'activo'`,
      [id],
    );
    if (!existing.length) return jsonError("Pregunta no encontrada", 404);

    const { id_tipo_auditoria, id_tipo_nc, texto, pares } = validacion.data;

    await capDb.query(
      `UPDATE preguntas
       SET id_tipo_auditoria = ?, id_tipo_nc = ?, texto = ?
       WHERE id_pregunta = ? AND estado = 'activo'`,
      [id_tipo_auditoria, id_tipo_nc, texto, id],
    );

    await reemplazarAlcancePregunta(id, pares);

    return jsonOk(
      {
        id_pregunta: Number(id),
        id_tipo_auditoria,
        id_tipo_nc,
        texto,
        alcance: pares,
        total_sub_areas: pares.length,
      },
      "Pregunta actualizada",
    );
  } catch (error) {
    return jsonError("Error al actualizar pregunta", 500, error.message);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = parseId(await params, "id");
    const row = await softDelete(capDb, "preguntas", "id_pregunta", id);
    if (!row) return jsonError("Pregunta no encontrada", 404);

    await capDb.query(
      `UPDATE pregunta_alcance SET estado = 'inactivo' WHERE id_pregunta = ?`,
      [id],
    );

    return jsonOk(null, "Pregunta eliminada");
  } catch (error) {
    return jsonError("Error al eliminar pregunta", 500, error.message);
  }
}
