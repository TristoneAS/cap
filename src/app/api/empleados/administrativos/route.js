import { empleados } from "@/libs/empleados";
import { mapEmpleadoRow, nombreCompletoEmpleado } from "@/libs/empleado_mapper";
import { sqlFiltroCategoriaResponsable } from "@/libs/empleados_responsables";
import { jsonError, jsonOk } from "@/libs/api_helpers";

/** Lista para Responsable en auditorías LPA y Poka Yoke (misma fuente). */
export async function GET() {
  try {
    const catWhere = sqlFiltroCategoriaResponsable();
    let rows;
    try {
      [rows] = await empleados.query(
        `SELECT * FROM del_empleados
         WHERE ${catWhere}
           AND emp_activo = 1
         ORDER BY emp_nombre ASC`,
      );
    } catch {
      [rows] = await empleados.query(
        `SELECT * FROM del_empleados
         WHERE ${catWhere}
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
    return jsonError("Error al consultar responsables", 500, error.message);
  }
}