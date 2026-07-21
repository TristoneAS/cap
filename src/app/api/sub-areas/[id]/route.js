import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk, parseId, softDelete } from "@/libs/api_helpers";

export async function PUT(request, { params }) {
  try {
    const id = parseId(await params, "id");
    const body = await request.json();
    const id_area = Number(body.id_area);
    const nombre = String(body.nombre ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim() || null;

    if (!id_area || !nombre) {
      return jsonError("Área y nombre son requeridos", 400);
    }

    const [existing] = await capDb.query(
      "SELECT id_sub_area FROM sub_areas WHERE id_sub_area = ? AND estado = 'activo'",
      [id],
    );
    if (!existing.length) return jsonError("Sub área no encontrada", 404);

    const [dup] = await capDb.query(
      `SELECT id_sub_area FROM sub_areas
       WHERE id_area = ? AND nombre = ? AND id_sub_area != ? AND estado = 'activo'`,
      [id_area, nombre, id],
    );
    if (dup.length) {
      return jsonError("Ya existe otra sub área con ese nombre", 409);
    }

    await capDb.query(
      "UPDATE sub_areas SET id_area = ?, nombre = ?, descripcion = ? WHERE id_sub_area = ?",
      [id_area, nombre, descripcion, id],
    );

    return jsonOk(
      { id_sub_area: Number(id), id_area, nombre, descripcion },
      "Sub área actualizada",
    );
  } catch (error) {
    return jsonError("Error al actualizar sub área", 500, error.message);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = parseId(await params, "id");
    const row = await softDelete(capDb, "sub_areas", "id_sub_area", id);
    if (!row) return jsonError("Sub área no encontrada", 404);
    return jsonOk(null, `Sub área "${row.nombre}" eliminada`);
  } catch (error) {
    return jsonError("Error al eliminar sub área", 500, error.message);
  }
}
