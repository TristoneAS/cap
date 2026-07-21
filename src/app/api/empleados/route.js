import { empleados } from "@/libs/empleados";
import { mapEmpleadoRow } from "@/libs/empleado_mapper";
import { jsonError, jsonOk } from "@/libs/api_helpers";

export async function GET() {
  try {
    let rows;
    try {
      [rows] = await empleados.query(
        "SELECT * FROM del_empleados WHERE emp_activo = 1 ORDER BY emp_nombre ASC",
      );
    } catch {
      [rows] = await empleados.query(
        "SELECT * FROM del_empleados ORDER BY emp_nombre ASC",
      );
    }
    return jsonOk(rows.map(mapEmpleadoRow));
  } catch (error) {
    return jsonError("Error al consultar empleados", 500, error.message);
  }
}
