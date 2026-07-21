import { empleados } from "@/libs/empleados";
import { mapEmpleadoRow } from "@/libs/empleado_mapper";
import { jsonError, jsonOk } from "@/libs/api_helpers";

export async function GET(_request, { params }) {
  try {
    const { emp_id } = await params;
    const id = String(emp_id ?? "").trim();

    if (!id) {
      return jsonError("El número de empleado es requerido", 400);
    }

    const [rows] = await empleados.query(
      "SELECT * FROM del_empleados WHERE emp_id = ?",
      [id],
    );

    if (!rows.length) {
      return jsonError("Empleado no encontrado", 404);
    }

    return jsonOk(mapEmpleadoRow(rows[0]));
  } catch (error) {
    console.error("Error al buscar empleado por emp_id:", error);
    return jsonError("Error al consultar empleado", 500, error.message);
  }
}
