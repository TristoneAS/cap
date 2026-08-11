import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk, parseId, softDelete } from "@/libs/api_helpers";
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

export async function PUT(request, { params }) {
  try {
    const id = parseId(await params, "id");
    const body = await request.json();
    const nombre = String(body.nombre ?? "").trim();
    const horaInicio = parseTime(body.hora_inicio, "Hora inicio");
    const horaFin = parseTime(body.hora_fin, "Hora fin");
    const orden = Number(body.orden ?? 0);

    if (!nombre) return jsonError("El nombre es requerido", 400);
    if (!horaInicio.ok) return jsonError(horaInicio.error, 400);
    if (!horaFin.ok) return jsonError(horaFin.error, 400);

    const [existing] = await capDb.query(
      "SELECT id_turno, codigo FROM turnos WHERE id_turno = ? AND estado = 'activo'",
      [id],
    );
    if (!existing.length) return jsonError("Turno no encontrado", 404);

    await capDb.query(
      `UPDATE turnos
       SET nombre = ?, hora_inicio = ?, hora_fin = ?, orden = ?
       WHERE id_turno = ?`,
      [nombre, horaInicio.value, horaFin.value, Number.isFinite(orden) ? orden : 0, id],
    );

    return jsonOk(
      formatTurnoRow({
        ...existing[0],
        nombre,
        hora_inicio: horaInicio.value,
        hora_fin: horaFin.value,
        orden: Number.isFinite(orden) ? orden : 0,
        estado: "activo",
      }),
      "Turno actualizado",
    );
  } catch (error) {
    return jsonError("Error al actualizar turno", 500, error.message);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = parseId(await params, "id");
    const row = await softDelete(capDb, "turnos", "id_turno", id);
    if (!row) return jsonError("Turno no encontrado", 404);

    await capDb.query("DELETE FROM sub_area_turnos WHERE id_turno = ?", [id]);

    return jsonOk(null, `Turno "${row.codigo}" eliminado`);
  } catch (error) {
    return jsonError("Error al eliminar turno", 500, error.message);
  }
}
