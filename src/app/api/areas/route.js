import { NextResponse } from "next/server";
import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";

export async function GET() {
  try {
    const [rows] = await capDb.query(
      `SELECT a.id_area, a.nombre, a.descripcion, a.estado, a.fecha_creacion
       FROM areas a
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

    if (!nombre) {
      return jsonError("El nombre es requerido", 400);
    }

    const [dup] = await capDb.query(
      "SELECT id_area FROM areas WHERE nombre = ? AND estado = 'activo'",
      [nombre],
    );
    if (dup.length) {
      return jsonError("Ya existe un área con ese nombre", 409);
    }

    const [result] = await capDb.query(
      "INSERT INTO areas (nombre, descripcion) VALUES (?, ?)",
      [nombre, descripcion],
    );

    return jsonOk(
      { id_area: result.insertId, nombre, descripcion },
      "Área creada correctamente",
      201,
    );
  } catch (error) {
    return jsonError("Error al crear área", 500, error.message);
  }
}
