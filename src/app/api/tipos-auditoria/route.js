import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";

const SELECT_LIST = `
  SELECT t.id_tipo_auditoria, t.nombre, t.descripcion, t.id_nivel_usuario,
         t.estado, nu.nombre AS nivel_nombre
  FROM tipos_auditoria t
  INNER JOIN niveles_usuario nu ON nu.id_nivel_usuario = t.id_nivel_usuario
  WHERE t.estado = 'activo' AND nu.estado = 'activo'
  ORDER BY t.nombre ASC
`;

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

export async function GET() {
  try {
    const [rows] = await capDb.query(SELECT_LIST);
    return jsonOk(rows);
  } catch (error) {
    return jsonError("Error al consultar tipos de auditoría", 500, error.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim() || null;
    const id_nivel_usuario = Number(body.id_nivel_usuario);

    if (!nombre) return jsonError("El nombre es requerido", 400);
    if (!id_nivel_usuario) return jsonError("El nivel es requerido", 400);
    if (!(await validateNivel(id_nivel_usuario))) {
      return jsonError("Nivel no válido", 400);
    }

    const [dup] = await capDb.query(
      "SELECT id_tipo_auditoria FROM tipos_auditoria WHERE nombre = ? AND estado = 'activo'",
      [nombre],
    );
    if (dup.length) return jsonError("Ya existe un registro con ese nombre", 409);

    const [result] = await capDb.query(
      "INSERT INTO tipos_auditoria (nombre, descripcion, id_nivel_usuario) VALUES (?, ?, ?)",
      [nombre, descripcion, id_nivel_usuario],
    );

    const [rows] = await capDb.query(SELECT_ONE, [result.insertId]);

    return jsonOk(rows[0], "Tipo de auditoría creado", 201);
  } catch (error) {
    return jsonError("Error al crear tipo de auditoría", 500, error.message);
  }
}
