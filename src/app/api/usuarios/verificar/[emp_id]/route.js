import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";

export async function GET(_request, { params }) {
  try {
    const { emp_id } = await params;
    const id = String(emp_id ?? "").trim();

    if (!id) {
      return jsonError("emp_id es requerido", 400);
    }

    const [rows] = await capDb.query(
      `SELECT u.id_usuario, u.emp_id, u.emp_nombre, u.emp_apellido_paterno, u.emp_apellido_materno,
              u.id_nivel_usuario, nu.nombre AS nivel_nombre
       FROM usuarios u
       INNER JOIN niveles_usuario nu ON nu.id_nivel_usuario = u.id_nivel_usuario
       WHERE u.emp_id = ? AND u.estado = 'activo' AND nu.estado = 'activo'`,
      [id],
    );

    if (!rows.length) {
      return jsonError("Usuario no registrado en CAP", 404);
    }

    return jsonOk(rows[0]);
  } catch (error) {
    return jsonError("Error al verificar usuario", 500, error.message);
  }
}
