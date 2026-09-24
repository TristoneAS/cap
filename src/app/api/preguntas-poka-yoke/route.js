import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";

const SELECT = `
  SELECT p.id_pregunta_poka, p.texto, p.id_tipo_nc, p.estado,
         nc.nombre AS tipo_nc_nombre
  FROM preguntas_poka_yoke p
  INNER JOIN tipos_no_conformidad nc ON nc.id_tipo_nc = p.id_tipo_nc
  WHERE p.estado = 'activo'
  ORDER BY p.id_pregunta_poka ASC
`;

export async function GET() {
  try {
    const [rows] = await capDb.query(SELECT);
    return jsonOk(rows);
  } catch (error) {
    return jsonError("Error al consultar preguntas Poka Yoke", 500, error.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const texto = String(body.texto ?? "").trim();
    const id_tipo_nc = Number(body.id_tipo_nc);
    if (!texto) return jsonError("El texto de la pregunta es requerido", 400);
    if (!id_tipo_nc) return jsonError("Seleccione un tipo de no conformidad", 400);

    const [tipoOk] = await capDb.query(
      "SELECT id_tipo_nc FROM tipos_no_conformidad WHERE id_tipo_nc = ? AND estado = 'activo'",
      [id_tipo_nc],
    );
    if (!tipoOk.length) return jsonError("Tipo de no conformidad no válido", 400);

    const [result] = await capDb.query(
      `INSERT INTO preguntas_poka_yoke (texto, id_tipo_nc)
       VALUES (?, ?)`,
      [texto, id_tipo_nc],
    );

    return jsonOk(
      {
        id_pregunta_poka: result.insertId,
        texto,
        id_tipo_nc,
        estado: "activo",
      },
      "Pregunta Poka Yoke creada",
      201,
    );
  } catch (error) {
    return jsonError("Error al crear pregunta Poka Yoke", 500, error.message);
  }
}
