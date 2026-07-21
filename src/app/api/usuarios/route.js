import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";

export async function GET() {
  try {
    const [rows] = await capDb.query(
      `SELECT u.id_usuario, u.emp_id, u.emp_nombre, u.emp_apellido_paterno, u.emp_apellido_materno,
              u.id_nivel_usuario, u.estado, nu.nombre AS nivel_nombre
       FROM usuarios u
       INNER JOIN niveles_usuario nu ON nu.id_nivel_usuario = u.id_nivel_usuario
       WHERE u.estado = 'activo' AND nu.estado = 'activo'
       ORDER BY u.emp_nombre ASC, u.emp_apellido_paterno ASC`,
    );
    return jsonOk(rows);
  } catch (error) {
    return jsonError("Error al consultar usuarios", 500, error.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const emp_id = String(body.emp_id ?? "").trim();
    const emp_nombre = String(body.emp_nombre ?? "").trim();
    const emp_apellido_paterno = String(body.emp_apellido_paterno ?? "").trim() || null;
    const emp_apellido_materno = String(body.emp_apellido_materno ?? "").trim() || null;
    const id_nivel_usuario = Number(body.id_nivel_usuario);

    if (!emp_id || !emp_nombre || !id_nivel_usuario) {
      return jsonError("Empleado y nivel son requeridos", 400);
    }

    const [nivel] = await capDb.query(
      "SELECT id_nivel_usuario FROM niveles_usuario WHERE id_nivel_usuario = ? AND estado = 'activo'",
      [id_nivel_usuario],
    );
    if (!nivel.length) return jsonError("Nivel no válido", 400);

    const [dup] = await capDb.query(
      "SELECT id_usuario FROM usuarios WHERE emp_id = ? AND estado = 'activo'",
      [emp_id],
    );
    if (dup.length) {
      return jsonError("Este empleado ya está registrado como usuario", 409);
    }

    const [result] = await capDb.query(
      `INSERT INTO usuarios
       (emp_id, emp_nombre, emp_apellido_paterno, emp_apellido_materno, id_nivel_usuario)
       VALUES (?, ?, ?, ?, ?)`,
      [emp_id, emp_nombre, emp_apellido_paterno, emp_apellido_materno, id_nivel_usuario],
    );

    return jsonOk(
      { id_usuario: result.insertId, emp_id, emp_nombre },
      "Usuario registrado correctamente",
      201,
    );
  } catch (error) {
    return jsonError("Error al registrar usuario", 500, error.message);
  }
}
