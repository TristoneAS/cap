import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk, parseId, softDelete } from "@/libs/api_helpers";

export async function PUT(request, { params }) {
  try {
    const id = parseId(await params, "id");
    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim() || null;

    if (!nombre) return jsonError("El nombre es requerido", 400);

    const [existing] = await capDb.query(
      "SELECT id_nivel_usuario FROM niveles_usuario WHERE id_nivel_usuario = ? AND estado = 'activo'",
      [id],
    );
    if (!existing.length) return jsonError("Nivel no encontrado", 404);

    const [dup] = await capDb.query(
      "SELECT id_nivel_usuario FROM niveles_usuario WHERE nombre = ? AND id_nivel_usuario != ? AND estado = 'activo'",
      [nombre, id],
    );
    if (dup.length) return jsonError("Ya existe otro nivel con ese nombre", 409);

    await capDb.query(
      "UPDATE niveles_usuario SET nombre = ?, descripcion = ? WHERE id_nivel_usuario = ?",
      [nombre, descripcion, id],
    );

    return jsonOk(
      { id_nivel_usuario: Number(id), nombre, descripcion },
      "Nivel actualizado",
    );
  } catch (error) {
    return jsonError("Error al actualizar nivel", 500, error.message);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = parseId(await params, "id");

    const [enUso] = await capDb.query(
      "SELECT id_usuario FROM usuarios WHERE id_nivel_usuario = ? AND estado = 'activo' LIMIT 1",
      [id],
    );
    if (enUso.length) {
      return jsonError(
        "No se puede eliminar: hay usuarios asignados a este nivel",
        409,
      );
    }

    const row = await softDelete(capDb, "niveles_usuario", "id_nivel_usuario", id);
    if (!row) return jsonError("Nivel no encontrado", 404);

    return jsonOk(null, `Nivel "${row.nombre}" eliminado`);
  } catch (error) {
    return jsonError("Error al eliminar nivel", 500, error.message);
  }
}
