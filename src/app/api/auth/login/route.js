import { NextResponse } from "next/server";
import { empleados } from "@/libs/empleados";
import { isAuthResponseOk, mensajeErrorAuth } from "@/libs/auth_login";
import {
  buildCapAccess,
  CAP_ROLE_GENERICO,
  hasPrivilegedCapRole,
  normalizeCapRolesFromAuth,
} from "@/libs/cap_roles";

const CAP_AUTH_PATH = process.env.AUTH_CAP_PATH || "/CAP/AUTHENTICATE";

function normalizeAuthBaseUrl(url) {
  return String(url ?? "").trim().replace(/\/+$/, "");
}

function resolveCapAuthServerUrl() {
  return normalizeAuthBaseUrl(process.env.NEXT_PUBLIC_AUTH_SERVER_URL);
}

async function buscarEmpleadoPorAlias(username) {
  const [rows] = await empleados.query(
    "SELECT * FROM del_empleados WHERE emp_alias = ?",
    [username],
  );
  return rows[0] || null;
}

async function llamarAuthenticate(authUrl, path, username, password) {
  const response = await fetch(`${authUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });

  let authData = {};
  try {
    authData = await response.json();
  } catch {
    authData = {};
  }

  return { response, authData };
}

function respuestaLoginOk(empleado, authData, capRoles) {
  const capAccess = buildCapAccess(capRoles);
  return NextResponse.json({
    success: true,
    auth: authData,
    empleado,
    capRoles,
    capAccess,
  });
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

    const capAuthUrl = resolveCapAuthServerUrl();
    if (!capAuthUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "Servidor CAP no configurado (NEXT_PUBLIC_AUTH_SERVER_URL)",
        },
        { status: 500 },
      );
    }

    let authData = {};
    let capRoles = [];

    try {
      const { response, authData: capAuthData } = await llamarAuthenticate(
        capAuthUrl,
        CAP_AUTH_PATH,
        username,
        password,
      );
      authData = capAuthData;

      if (!isAuthResponseOk(response, authData)) {
        return NextResponse.json(
          { success: false, error: mensajeErrorAuth(authData) },
          { status: 401 },
        );
      }

      capRoles = normalizeCapRolesFromAuth(authData);

      const tienePrivilegio = hasPrivilegedCapRole(capRoles);
      const esGenerico = capRoles.includes(CAP_ROLE_GENERICO);
      if (!tienePrivilegio && !esGenerico) {
        return NextResponse.json(
          {
            success: false,
            error:
              "No tiene un rol CAP asignado. Se requiere CAP_Generico o un rol de área.",
          },
          { status: 403 },
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

      return respuestaLoginOk(empleado, authData, capRoles);
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
