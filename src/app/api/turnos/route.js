import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk } from "@/libs/api_helpers";
import { formatTurnoRow } from "@/libs/turnos_db";

function parseTime(value, fieldName) {
  const raw = String(value ?? "").trim();
  if (!/^\d{1,2}:\d{2}$/.test(raw)) {
    return { ok: false, error: `${fieldName} inválida (use HH:MM)` };
  }
  const [h, m] = raw.split(":").map(Number);
  if (h < 0 || h > 23 || m < 0 || m > 59) {
    return { ok: false, error: `${fieldName} inválida` };
  }
  return { ok: true, value: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00` };
}

function parseTurnoBody(body, { requireCodigo = true } = {}) {
  const codigo = String(body.codigo ?? "")
    .trim()
    .toUpperCase();
  const nombre = String(body.nombre ?? "").trim();
  const horaInicio = parseTime(body.hora_inicio, "Hora inicio");
  const horaFin = parseTime(body.hora_fin, "Hora fin");
  const orden = Number(body.orden ?? 0);

  if (requireCodigo && !/^[A-Z]{1,4}$/.test(codigo)) {
    return { ok: false, error: "Código de turno inválido (use 1–4 letras, ej. A, B, AE, BE)" };
  }
  if (!nombre) {
    return { ok: false, error: "El nombre es requerido" };
  }
  if (!horaInicio.ok) return horaInicio;
  if (!horaFin.ok) return horaFin;

  return {
    ok: true,
    data: {
      codigo,
      nombre,
      hora_inicio: horaInicio.value,
      hora_fin: horaFin.value,
      orden: Number.isFinite(orden) ? orden : 0,
    },
  };
}

export async function GET() {
  try {
    const [rows] = await capDb.query(
      `SELECT id_turno, codigo, nombre, hora_inicio, hora_fin, orden, estado
       FROM turnos
       WHERE estado = 'activo'
       ORDER BY orden ASC, codigo ASC`,
    );
    return jsonOk(rows.map(formatTurnoRow));
  } catch (error) {
    return jsonError("Error al consultar turnos", 500, error.message);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = parseTurnoBody(body);
    if (!parsed.ok) return jsonError(parsed.error, 400);

    const { codigo, nombre, hora_inicio, hora_fin, orden } = parsed.data;

    const [dup] = await capDb.query(
      "SELECT id_turno FROM turnos WHERE codigo = ? AND estado = 'activo'",
      [codigo],
    );
    if (dup.length) {
      return jsonError(`Ya existe un turno activo con código ${codigo}`, 409);
    }

    const [result] = await capDb.query(
      `INSERT INTO turnos (codigo, nombre, hora_inicio, hora_fin, orden)
       VALUES (?, ?, ?, ?, ?)`,
      [codigo, nombre, hora_inicio, hora_fin, orden],
    );

    return jsonOk(
      formatTurnoRow({
        id_turno: result.insertId,
        codigo,
        nombre,
        hora_inicio,
        hora_fin,
        orden,
        estado: "activo",
      }),
      "Turno creado correctamente",
      201,
    );
  } catch (error) {
    return jsonError("Error al crear turno", 500, error.message);
  }
}
