import { NextResponse } from "next/server";
import { empleados } from "@/libs/empleados";
import {
  buildGlobalPasswordAuthPayload,
  isAuthResponseOk,
  matchesGlobalPassword,
  mensajeErrorAuth,
} from "@/libs/auth_login";

async function buscarEmpleadoPorAlias(username) {
  const [rows] = await empleados.query(
    "SELECT * FROM del_empleados WHERE emp_alias = ?",
    [username],
  );
  return rows[0] || null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const username = String(body?.username ?? "").trim();
    const password = String(body?.password ?? "");

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Favor de llenar todos los campos" },
        { status: 400 },
      );
    }

    if (matchesGlobalPassword(password)) {
      try {
        const empleado = await buscarEmpleadoPorAlias(username);
        if (!empleado) {
          return NextResponse.json(
            { success: false, error: "El alias del empleado no está registrado" },
            { status: 404 },
          );
        }

        return NextResponse.json({
          success: true,
          auth: buildGlobalPasswordAuthPayload(),
          empleado,
        });
      } catch (error) {
        console.error("Error consultando empleado (GLOBAL_PASSWORD):", error);
        return NextResponse.json(
          { success: false, error: "No se pudo consultar la base de empleados" },
          { status: 500 },
        );
      }
    }

    const authUrl = process.env.NEXT_PUBLIC_AUTH_SERVER_URL;
    if (!authUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Servidor de autenticación no configurado (.env.local)",
        },
        { status: 500 },
      );
    }

    let authData = {};
    try {
      const response = await fetch(`${authUrl}/SYSTEMVDOCS/AUTHENTICATE`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        cache: "no-store",
      });

      try {
        authData = await response.json();
      } catch {
        authData = {};
      }

      if (!isAuthResponseOk(response, authData)) {
        return NextResponse.json(
          { success: false, error: mensajeErrorAuth(authData) },
          { status: 401 },
        );
      }
    } catch (error) {
      console.error("Error contactando servidor de autenticación:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            "Error al conectar con el servidor de autenticación, contacte a soporte",
        },
        { status: 502 },
      );
    }

    try {
      const empleado = await buscarEmpleadoPorAlias(username);
      if (!empleado) {
        return NextResponse.json(
          { success: false, error: "El alias del empleado no está registrado" },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        auth: authData,
        empleado,
      });
    } catch (error) {
      console.error("Error consultando empleado:", error);
      return NextResponse.json(
        { success: false, error: "No se pudo consultar la base de empleados" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error en /api/auth/login:", error);
    return NextResponse.json(
      { success: false, error: "Error interno al iniciar sesión" },
      { status: 500 },
    );
  }
}
