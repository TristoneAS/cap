import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk, parseId, softDelete } from "@/libs/api_helpers";

export async function GET(_request, { params }) {
  try {
    const id = parseId(await params, "id");
    const [rows] = await capDb.query(
      "SELECT * FROM areas WHERE id_area = ? AND estado = 'activo'",
      [id],
    );
    if (!rows.length) return jsonError("Área no encontrada", 404);
    return jsonOk(rows[0]);
  } catch (error) {
    return jsonError("Error al consultar área", 500, error.message);
  }
}

export async function PUT(request, { params }) {
  try {
    const id = parseId(await params, "id");
    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim() || null;
    const idNivelRaw = body.id_nivel_usuario;
    const id_nivel_usuario =
      idNivelRaw === "" || idNivelRaw == null ? null : Number(idNivelRaw) || null;

    if (!nombre) return jsonError("El nombre es requerido", 400);

    if (id_nivel_usuario != null) {
      const [nivel] = await capDb.query(
        "SELECT id_nivel_usuario FROM niveles_usuario WHERE id_nivel_usuario = ? AND estado = 'activo'",
        [id_nivel_usuario],
      );
      if (!nivel.length) return jsonError("Nivel de auditor no válido", 400);
    }

    const [existing] = await capDb.query(
      "SELECT id_area FROM areas WHERE id_area = ? AND estado = 'activo'",
      [id],
    );
    if (!existing.length) return jsonError("Área no encontrada", 404);

    const [dup] = await capDb.query(
      "SELECT id_area FROM areas WHERE nombre = ? AND id_area != ? AND estado = 'activo'",
      [nombre, id],
    );
    if (dup.length) return jsonError("Ya existe otra área con ese nombre", 409);

    await capDb.query(
      "UPDATE areas SET nombre = ?, descripcion = ?, id_nivel_usuario = ? WHERE id_area = ?",
      [nombre, descripcion, id_nivel_usuario, id],
    );

    return jsonOk(
      { id_area: Number(id), nombre, descripcion, id_nivel_usuario },
      "Área actualizada",
    );
  } catch (error) {
    return jsonError("Error al actualizar área", 500, error.message);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = parseId(await params, "id");
    const row = await softDelete(capDb, "areas", "id_area", id);
    if (!row) return jsonError("Área no encontrada", 404);

    await capDb.query(
      "UPDATE sub_areas SET estado = 'inactivo' WHERE id_area = ?",
      [id],
    );

    return jsonOk(null, `Área "${row.nombre}" eliminada`);
  } catch (error) {
    return jsonError("Error al eliminar área", 500, error.message);
  }
}
