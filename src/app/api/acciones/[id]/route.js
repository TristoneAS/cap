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
      "SELECT id_accion FROM acciones WHERE id_accion = ? AND estado = 'activo'",
      [id],
    );
    if (!existing.length) return jsonError("Acción no encontrada", 404);

    await capDb.query(
      "UPDATE acciones SET nombre = ?, descripcion = ? WHERE id_accion = ?",
      [nombre, descripcion, id],
    );
    return jsonOk({ id_accion: Number(id), nombre, descripcion }, "Acción actualizada");
  } catch (error) {
    return jsonError("Error al actualizar", 500, error.message);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = parseId(await params, "id");
    const row = await softDelete(capDb, "acciones", "id_accion", id);
    if (!row) return jsonError("Acción no encontrada", 404);
    return jsonOk(null, `Acción "${row.nombre}" eliminada`);
  } catch (error) {
    return jsonError("Error al eliminar", 500, error.message);
  }
}
