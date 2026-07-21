import { NextResponse } from "next/server";
import { empleados } from "@/libs/empleados";

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const emp_alias = resolvedParams.emp_alias;

    if (!emp_alias) {
      return NextResponse.json(
        { error: "El alias del empleado es requerido" },
        { status: 400 },
      );
    }

    const [rows] = await empleados.query(
      "SELECT * FROM del_empleados WHERE emp_alias = ?",
      [emp_alias],
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Error al buscar empleado:", error);
    return NextResponse.json(
      {
        error: "Error al consultar la base de datos",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
