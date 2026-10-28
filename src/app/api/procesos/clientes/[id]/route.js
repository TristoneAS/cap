import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk, parseId, softDelete } from "@/libs/api_helpers";
import { normalizeNombreCliente } from "@/libs/procesos_clientes";

export async function PUT(request, { params }) {
  try {
    const id = parseId(await params, "id");
    const body = await request.json();
    const cliente = normalizeNombreCliente(body.cliente);

    if (!cliente) return jsonError("El nombre de cliente es requerido", 400);

    const [existing] = await capDb.query(
      "SELECT id_cliente FROM procesos_clientes WHERE id_cliente = ? AND estado = 'activo'",
      [id],
    );
    if (!existing.length) return jsonError("Cliente no encontrado", 404);

    await capDb.query(
      "UPDATE procesos_clientes SET cliente = ? WHERE id_cliente = ?",
      [cliente, id],
    );

    return jsonOk({ id_cliente: Number(id), cliente }, "Cliente actualizado");
  } catch (error) {
    return jsonError("Error al actualizar cliente", 500, error.message);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = parseId(await params, "id");
    const row = await softDelete(capDb, "procesos_clientes", "id_cliente", id);
    if (!row) return jsonError("Cliente no encontrado", 404);
    return jsonOk(null, `Cliente "${row.cliente || id}" eliminado`);
  } catch (error) {
    return jsonError("Error al eliminar cliente", 500, error.message);
  }
}
