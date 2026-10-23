import { NextResponse } from "next/server";
import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";

export async function GET() {
  try {
    const [rows] = await capDb.query(
      `SELECT a.id_area, a.nombre, a.descripcion, a.id_nivel_usuario, a.estado,
              a.fecha_creacion, nu.nombre AS nivel_nombre
       FROM areas a
       LEFT JOIN niveles_usuario nu
         ON nu.id_nivel_usuario = a.id_nivel_usuario AND nu.estado = 'activo'
       WHERE a.estado = 'activo'
       ORDER BY a.nombre ASC`,
    );
    return jsonOk(rows);
  } catch (error) {
    return jsonError("Error al consultar áreas", 500, error.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim() || null;
    const idNivelRaw = body.id_nivel_usuario;
    const id_nivel_usuario =
      idNivelRaw === "" || idNivelRaw == null ? null : Number(idNivelRaw) || null;

    if (!nombre) {
      return jsonError("El nombre es requerido", 400);
    }

    if (id_nivel_usuario != null) {
      const [nivel] = await capDb.query(
        "SELECT id_nivel_usuario FROM niveles_usuario WHERE id_nivel_usuario = ? AND estado = 'activo'",
        [id_nivel_usuario],
      );
      if (!nivel.length) return jsonError("Nivel de auditor no válido", 400);
    }

    const [dup] = await capDb.query(
      "SELECT id_area FROM areas WHERE nombre = ? AND estado = 'activo'",
      [nombre],
    );
    if (dup.length) {
      return jsonError("Ya existe un área con ese nombre", 409);
    }

    const [result] = await capDb.query(
      "INSERT INTO areas (nombre, descripcion, id_nivel_usuario) VALUES (?, ?, ?)",
      [nombre, descripcion, id_nivel_usuario],
    );

    return jsonOk(
      { id_area: result.insertId, nombre, descripcion, id_nivel_usuario },
      "Área creada correctamente",
      201,
    );
  } catch (error) {
    return jsonError("Error al crear área", 500, error.message);
  }
}
