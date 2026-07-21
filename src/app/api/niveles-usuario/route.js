import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";

export async function GET() {
  try {
    const [rows] = await capDb.query(
      "SELECT * FROM niveles_usuario WHERE estado = 'activo' ORDER BY nombre ASC",
    );
    return jsonOk(rows);
  } catch (error) {
    return jsonError("Error al consultar niveles de usuario", 500, error.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim() || null;

    if (!nombre) {
      return jsonError("El nombre es requerido", 400);
    }

    const [dup] = await capDb.query(
      "SELECT id_nivel_usuario FROM niveles_usuario WHERE nombre = ? AND estado = 'activo'",
      [nombre],
    );
    if (dup.length) {
      return jsonError("Ya existe un nivel con ese nombre", 409);
    }

    const [result] = await capDb.query(
      "INSERT INTO niveles_usuario (nombre, descripcion) VALUES (?, ?)",
      [nombre, descripcion],
    );

    return jsonOk(
      { id_nivel_usuario: result.insertId, nombre, descripcion },
      "Nivel creado correctamente",
      201,
    );
  } catch (error) {
    return jsonError("Error al crear nivel", 500, error.message);
  }
}
