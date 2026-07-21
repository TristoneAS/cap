import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk, parseId, softDelete } from "@/libs/api_helpers";

const SELECT_ONE = `
  SELECT t.id_tipo_auditoria, t.nombre, t.descripcion, t.id_nivel_usuario,
         t.estado, nu.nombre AS nivel_nombre
  FROM tipos_auditoria t
  INNER JOIN niveles_usuario nu ON nu.id_nivel_usuario = t.id_nivel_usuario
  WHERE t.estado = 'activo' AND nu.estado = 'activo' AND t.id_tipo_auditoria = ?
`;

async function validateNivel(id_nivel_usuario) {
  const [nivel] = await capDb.query(
    "SELECT id_nivel_usuario FROM niveles_usuario WHERE id_nivel_usuario = ? AND estado = 'activo'",
    [id_nivel_usuario],
  );
  return nivel.length > 0;
}

export async function PUT(request, { params }) {
  try {
    const id = parseId(await params, "id");
    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim() || null;
    const id_nivel_usuario = Number(body.id_nivel_usuario);

    if (!nombre) return jsonError("El nombre es requerido", 400);
    if (!id_nivel_usuario) return jsonError("El nivel es requerido", 400);
    if (!(await validateNivel(id_nivel_usuario))) {
      return jsonError("Nivel no válido", 400);
    }

    const [existing] = await capDb.query(
      "SELECT id_tipo_auditoria FROM tipos_auditoria WHERE id_tipo_auditoria = ? AND estado = 'activo'",
      [id],
    );
    if (!existing.length) return jsonError("Tipo no encontrado", 404);

    const [dup] = await capDb.query(
      `SELECT id_tipo_auditoria FROM tipos_auditoria
       WHERE nombre = ? AND id_tipo_auditoria != ? AND estado = 'activo'`,
      [nombre, id],
    );
    if (dup.length) return jsonError("Ya existe otro tipo con ese nombre", 409);

    await capDb.query(
      "UPDATE tipos_auditoria SET nombre = ?, descripcion = ?, id_nivel_usuario = ? WHERE id_tipo_auditoria = ?",
      [nombre, descripcion, id_nivel_usuario, id],
    );

    const [rows] = await capDb.query(SELECT_ONE, [id]);
    return jsonOk(rows[0], "Tipo actualizado");
  } catch (error) {
    return jsonError("Error al actualizar", 500, error.message);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = parseId(await params, "id");
    const row = await softDelete(capDb, "tipos_auditoria", "id_tipo_auditoria", id);
    if (!row) return jsonError("Tipo no encontrado", 404);
    return jsonOk(null, `Tipo "${row.nombre}" eliminado`);
  } catch (error) {
    return jsonError("Error al eliminar", 500, error.message);
  }
}
