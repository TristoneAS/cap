import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";

export async function GET() {
  try {
    const [rows] = await capDb.query(
      "SELECT * FROM acciones WHERE estado = 'activo' ORDER BY nombre ASC",
    );
    return jsonOk(rows);
  } catch (error) {
    return jsonError("Error al consultar acciones", 500, error.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim() || null;
    if (!nombre) return jsonError("El nombre es requerido", 400);

    const [dup] = await capDb.query(
      "SELECT id_accion FROM acciones WHERE nombre = ? AND estado = 'activo'",
      [nombre],
    );
    if (dup.length) return jsonError("Ya existe una acción con ese nombre", 409);

    const [result] = await capDb.query(
      "INSERT INTO acciones (nombre, descripcion) VALUES (?, ?)",
      [nombre, descripcion],
    );

    return jsonOk(
      { id_accion: result.insertId, nombre, descripcion },
      "Acción creada",
      201,
    );
  } catch (error) {
    return jsonError("Error al crear acción", 500, error.message);
  }
}
