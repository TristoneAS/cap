import { empleados } from "@/libs/empleados";
import { mapEmpleadoRow, nombreCompletoEmpleado } from "@/libs/empleado_mapper";
import { jsonError, jsonOk } from "@/libs/api_helpers";

export async function GET() {
  try {
    let rows;
    try {
      [rows] = await empleados.query(
        `SELECT * FROM del_empleados
         WHERE UPPER(TRIM(emp_categoria)) IN ('ADMINISTRATIVOS', 'ADMINISTRATIVE')
           AND emp_activo = 1
         ORDER BY emp_nombre ASC`,
      );
    } catch {
      [rows] = await empleados.query(
        `SELECT * FROM del_empleados
         WHERE UPPER(TRIM(emp_categoria)) IN ('ADMINISTRATIVOS', 'ADMINISTRATIVE')
         ORDER BY emp_nombre ASC`,
      );
    }

    const data = rows.map((row) => {
      const mapped = mapEmpleadoRow(row);
      return {
        ...mapped,
        nombre_completo: nombreCompletoEmpleado(row) || mapped.emp_nombre,
      };
    });

    return jsonOk(data);
  } catch (error) {
    return jsonError("Error al consultar empleados administrativos", 500, error.message);
  }
}
