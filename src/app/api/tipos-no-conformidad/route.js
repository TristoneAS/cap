import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";

export async function GET() {
  try {
    const [rows] = await capDb.query(
      "SELECT * FROM tipos_no_conformidad WHERE estado = 'activo' ORDER BY nombre ASC",
    );
    return jsonOk(rows);
  } catch (error) {
    return jsonError("Error al consultar tipos de no conformidad", 500, error.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim() || null;
    if (!nombre) return jsonError("El nombre es requerido", 400);

    const [dup] = await capDb.query(
      "SELECT id_tipo_nc FROM tipos_no_conformidad WHERE nombre = ? AND estado = 'activo'",
      [nombre],
    );
    if (dup.length) return jsonError("Ya existe un tipo con ese nombre", 409);

    const [result] = await capDb.query(
      "INSERT INTO tipos_no_conformidad (nombre, descripcion) VALUES (?, ?)",
      [nombre, descripcion],
    );

    return jsonOk(
      { id_tipo_nc: result.insertId, nombre, descripcion },
      "Tipo de no conformidad creado",
      201,
    );
  } catch (error) {
    return jsonError("Error al crear", 500, error.message);
  }
}
