import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk, parseId, softDelete } from "@/libs/api_helpers";

export async function PUT(request, { params }) {
  try {
    const id = parseId(await params, "id");
    const body = await request.json();
    const id_nivel_usuario = Number(body.id_nivel_usuario);

    if (!id_nivel_usuario) {
      return jsonError("El nivel es requerido", 400);
    }

    const [existing] = await capDb.query(
      "SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND estado = 'activo'",
      [id],
    );
    if (!existing.length) return jsonError("Usuario no encontrado", 404);

    const [nivel] = await capDb.query(
      "SELECT id_nivel_usuario FROM niveles_usuario WHERE id_nivel_usuario = ? AND estado = 'activo'",
      [id_nivel_usuario],
    );
    if (!nivel.length) return jsonError("Nivel no válido", 400);

    await capDb.query(
      "UPDATE usuarios SET id_nivel_usuario = ? WHERE id_usuario = ?",
      [id_nivel_usuario, id],
    );

    return jsonOk({ id_usuario: Number(id) }, "Usuario actualizado");
  } catch (error) {
    return jsonError("Error al actualizar usuario", 500, error.message);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = parseId(await params, "id");
    const row = await softDelete(capDb, "usuarios", "id_usuario", id);
    if (!row) return jsonError("Usuario no encontrado", 404);
    return jsonOk(null, `Usuario ${row.emp_id} eliminado`);
  } catch (error) {
    return jsonError("Error al eliminar usuario", 500, error.message);
  }
}
