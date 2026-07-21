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
      "SELECT id_tipo_nc FROM tipos_no_conformidad WHERE id_tipo_nc = ? AND estado = 'activo'",
      [id],
    );
    if (!existing.length) return jsonError("Registro no encontrado", 404);

    await capDb.query(
      "UPDATE tipos_no_conformidad SET nombre = ?, descripcion = ? WHERE id_tipo_nc = ?",
      [nombre, descripcion, id],
    );
    return jsonOk({ id_tipo_nc: Number(id), nombre, descripcion }, "Actualizado");
  } catch (error) {
    return jsonError("Error al actualizar", 500, error.message);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = parseId(await params, "id");
    const row = await softDelete(capDb, "tipos_no_conformidad", "id_tipo_nc", id);
    if (!row) return jsonError("Registro no encontrado", 404);
    return jsonOk(null, `Tipo "${row.nombre}" eliminado`);
  } catch (error) {
    return jsonError("Error al eliminar", 500, error.message);
  }
}
