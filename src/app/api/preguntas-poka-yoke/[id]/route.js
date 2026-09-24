import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk, parseId, softDelete } from "@/libs/api_helpers";

export async function PUT(request, { params }) {
  try {
    const id = parseId(await params, "id");
    const body = await request.json();
    const texto = String(body.texto ?? "").trim();
    const id_tipo_nc = Number(body.id_tipo_nc);
    if (!texto) return jsonError("El texto de la pregunta es requerido", 400);
    if (!id_tipo_nc) return jsonError("Seleccione un tipo de no conformidad", 400);

    const [existing] = await capDb.query(
      "SELECT id_pregunta_poka FROM preguntas_poka_yoke WHERE id_pregunta_poka = ? AND estado = 'activo'",
      [id],
    );
    if (!existing.length) return jsonError("Pregunta no encontrada", 404);

    const [tipoOk] = await capDb.query(
      "SELECT id_tipo_nc FROM tipos_no_conformidad WHERE id_tipo_nc = ? AND estado = 'activo'",
      [id_tipo_nc],
    );
    if (!tipoOk.length) return jsonError("Tipo de no conformidad no válido", 400);

    await capDb.query(
      "UPDATE preguntas_poka_yoke SET texto = ?, id_tipo_nc = ? WHERE id_pregunta_poka = ?",
      [texto, id_tipo_nc, id],
    );

    return jsonOk(
      { id_pregunta_poka: Number(id), texto, id_tipo_nc },
      "Pregunta actualizada",
    );
  } catch (error) {
    return jsonError("Error al actualizar", 500, error.message);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = parseId(await params, "id");
    const row = await softDelete(capDb, "preguntas_poka_yoke", "id_pregunta_poka", id);
    if (!row) return jsonError("Pregunta no encontrada", 404);
    return jsonOk(null, "Pregunta Poka Yoke eliminada");
  } catch (error) {
    return jsonError("Error al eliminar", 500, error.message);
  }
}
