import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk, parseId, softDelete } from "@/libs/api_helpers";
import { validarRelacionesPregunta } from "@/libs/preguntas_helpers";

export async function PUT(request, { params }) {
  try {
    const id = parseId(await params, "id");
    const body = await request.json();
    const validacion = await validarRelacionesPregunta(body);
    if (validacion.error) return jsonError(validacion.error, validacion.status);

    const [existing] = await capDb.query(
      `SELECT id_pregunta, texto
       FROM preguntas
       WHERE id_pregunta = ? AND estado = 'activo'`,
      [id],
    );
    if (!existing.length) return jsonError("Pregunta no encontrada", 404);

    const { id_tipo_auditoria, id_area, id_sub_area, id_tipo_nc, texto } =
      validacion.data;
    const textoOriginal = existing[0].texto;

    // Misma pregunta en varias sub áreas: actualiza contenido en todas las del mismo texto.
    const [syncResult] = await capDb.query(
      `UPDATE preguntas
       SET id_tipo_auditoria = ?, id_tipo_nc = ?, texto = ?
       WHERE estado = 'activo' AND texto = ?`,
      [id_tipo_auditoria, id_tipo_nc, texto, textoOriginal],
    );

    await capDb.query(
      `UPDATE preguntas
       SET id_area = ?, id_sub_area = ?
       WHERE id_pregunta = ? AND estado = 'activo'`,
      [id_area, id_sub_area, id],
    );

    const actualizadas = Number(syncResult.affectedRows) || 1;

    return jsonOk(
      {
        id_pregunta: Number(id),
        id_tipo_auditoria,
        id_area,
        id_sub_area,
        id_tipo_nc,
        texto,
        actualizadas,
      },
      actualizadas === 1
        ? "Pregunta actualizada"
        : `Se actualizaron ${actualizadas} preguntas con el mismo texto`,
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
    return jsonOk(null, "Pregunta eliminada");
  } catch (error) {
    return jsonError("Error al eliminar pregunta", 500, error.message);
  }
}
