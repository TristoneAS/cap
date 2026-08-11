import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";
import {
  attachTurnosToSubAreas,
  getDefaultTurnoIds,
  syncSubAreaTurnos,
} from "@/libs/turnos_db";

function parseTurnoIds(body) {
  const raw = body.id_turnos ?? body.turno_ids ?? [];
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map(Number).filter(Boolean))];
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idArea = searchParams.get("id_area");

    let sql = `
      SELECT sa.id_sub_area, sa.id_area, sa.nombre, sa.descripcion, sa.estado,
             a.nombre AS area_nombre
      FROM sub_areas sa
      INNER JOIN areas a ON a.id_area = sa.id_area
      WHERE sa.estado = 'activo' AND a.estado = 'activo'
    `;
    const params = [];

    if (idArea) {
      sql += " AND sa.id_area = ?";
      params.push(idArea);
    }

    sql += " ORDER BY a.nombre ASC, sa.nombre ASC";

    const [rows] = await capDb.query(sql, params);
    const data = await attachTurnosToSubAreas(rows);
    return jsonOk(data);
  } catch (error) {
    return jsonError("Error al consultar sub áreas", 500, error.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const id_area = Number(body.id_area);
    const nombre = String(body.nombre ?? "").trim();
    const descripcion = String(body.descripcion ?? "").trim() || null;
    let idTurnos = parseTurnoIds(body);

    if (!id_area || !nombre) {
      return jsonError("Área y nombre son requeridos", 400);
    }

    const [area] = await capDb.query(
      "SELECT id_area FROM areas WHERE id_area = ? AND estado = 'activo'",
      [id_area],
    );
    if (!area.length) return jsonError("Área no válida", 400);

    const [dup] = await capDb.query(
      "SELECT id_sub_area FROM sub_areas WHERE id_area = ? AND nombre = ? AND estado = 'activo'",
      [id_area, nombre],
    );
    if (dup.length) {
      return jsonError("Ya existe una sub área con ese nombre en el área", 409);
    }

    if (!idTurnos.length) {
      idTurnos = await getDefaultTurnoIds();
    }
    if (!idTurnos.length) {
      return jsonError("Configure al menos un turno activo antes de crear sub áreas", 400);
    }

    const [result] = await capDb.query(
      "INSERT INTO sub_areas (id_area, nombre, descripcion) VALUES (?, ?, ?)",
      [id_area, nombre, descripcion],
    );

    const idSubArea = result.insertId;
    await syncSubAreaTurnos(capDb, idSubArea, idTurnos);

    const [rows] = await capDb.query(
      `SELECT sa.id_sub_area, sa.id_area, sa.nombre, sa.descripcion,
              a.nombre AS area_nombre
       FROM sub_areas sa
       INNER JOIN areas a ON a.id_area = sa.id_area
       WHERE sa.id_sub_area = ?`,
      [idSubArea],
    );
    const [row] = await attachTurnosToSubAreas(rows);

    return jsonOk(row, "Sub área creada correctamente", 201);
  } catch (error) {
    return jsonError("Error al crear sub área", 500, error.message);
  }
}
