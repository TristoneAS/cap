import { capDb } from "@/libs/cap_db";
import { jsonError, jsonOk, parseId } from "@/libs/api_helpers";
import { puedeAuditarEnHorario } from "@/libs/turno_horario";

export async function PUT(request, { params }) {
  try {
    const idAuditoria = parseId(await params, "id");
    const body = await request.json();
    const empId = String(body.emp_id ?? "").trim();
    const respuestas = Array.isArray(body.respuestas) ? body.respuestas : [];
    const isAdmin =
      body.is_admin === true ||
      body.is_admin === "true" ||
      body.is_admin === 1;

    if (!empId) return jsonError("emp_id es requerido", 400);
    if (!respuestas.length) return jsonError("No hay respuestas para guardar", 400);

    const [auditorias] = await capDb.query(
      "SELECT id_auditoria, emp_id, estado, turno FROM auditorias WHERE id_auditoria = ?",
      [idAuditoria],
    );
    if (!auditorias.length) return jsonError("Auditoría no encontrada", 404);

    const aud = auditorias[0];
    if (String(aud.emp_id) !== empId) {
      return jsonError(
        isAdmin
          ? "emp_id debe ser el auditor asignado a la auditoría"
          : "No tiene permiso para auditar esta asignación",
        isAdmin ? 400 : 403,
      );
    }
    if (aud.estado === "completada" || aud.estado === "cancelada") {
      return jsonError("Esta auditoría ya está cerrada", 409);
    }

    if (!isAdmin) {
      const horario = puedeAuditarEnHorario(aud.turno);
      if (!horario.ok) {
        return jsonError(horario.motivo, 403);
      }
    }

    for (const item of respuestas) {
      const id_pregunta = Number(item.id_pregunta);
      const cumple = item.cumple === "si" || item.cumple === "no" ? item.cumple : null;

      if (!id_pregunta || !cumple) {
        return jsonError("Cada pregunta debe tener respuesta Sí o No", 400);
      }

      let hallazgo = null;
      let id_tipo_nc = null;
      let id_accion = null;
      let emp_id_responsable = null;
      let emp_nombre_responsable = null;

      if (cumple === "no") {
        hallazgo = String(item.hallazgo ?? "").trim() || null;
        id_tipo_nc = Number(item.id_tipo_nc) || null;
        id_accion = Number(item.id_accion) || null;
        emp_id_responsable = String(item.emp_id_responsable ?? "").trim() || null;
        emp_nombre_responsable =
          String(item.emp_nombre_responsable ?? "").trim() || null;

        if (!hallazgo) {
          return jsonError("Indique el hallazgo cuando la respuesta es No", 400);
        }
        if (!id_tipo_nc) {
          return jsonError("Seleccione el tipo de no conformidad cuando la respuesta es No", 400);
        }
        if (!id_accion) {
          return jsonError("Seleccione una acción cuando la respuesta es No", 400);
        }
        if (!emp_id_responsable) {
          return jsonError("Seleccione un responsable cuando la respuesta es No", 400);
        }

        const [tipoNc] = await capDb.query(
          "SELECT id_tipo_nc FROM tipos_no_conformidad WHERE id_tipo_nc = ? AND estado = 'activo'",
          [id_tipo_nc],
        );
        if (!tipoNc.length) return jsonError("Tipo de no conformidad no válido", 400);

        const [accion] = await capDb.query(
          "SELECT id_accion FROM acciones WHERE id_accion = ? AND estado = 'activo'",
          [id_accion],
        );
        if (!accion.length) return jsonError("Acción no válida", 400);
      }

      await capDb.query(
        `INSERT INTO auditoria_respuestas
         (id_auditoria, id_pregunta, cumple, hallazgo, id_tipo_nc, id_accion, emp_id_responsable, emp_nombre_responsable)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           cumple = VALUES(cumple),
           hallazgo = VALUES(hallazgo),
           id_tipo_nc = VALUES(id_tipo_nc),
           id_accion = VALUES(id_accion),
           emp_id_responsable = VALUES(emp_id_responsable),
           emp_nombre_responsable = VALUES(emp_nombre_responsable)`,
        [
          idAuditoria,
          id_pregunta,
          cumple,
          hallazgo,
          id_tipo_nc,
          id_accion,
          emp_id_responsable,
          emp_nombre_responsable,
        ],
      );
    }

    const [preguntas] = await capDb.query(
      `SELECT p.id_pregunta
       FROM preguntas p
       INNER JOIN auditorias aud ON aud.id_auditoria = ?
       WHERE p.estado = 'activo'
         AND p.id_tipo_auditoria = aud.id_tipo_auditoria
         AND p.id_area = aud.id_area
         AND p.id_sub_area = aud.id_sub_area`,
      [idAuditoria],
    );

    const [respondidas] = await capDb.query(
      `SELECT COUNT(*) AS total FROM auditoria_respuestas
       WHERE id_auditoria = ? AND cumple IS NOT NULL`,
      [idAuditoria],
    );

    const totalPreguntas = preguntas.length;
    const totalRespondidas = respondidas[0]?.total ?? 0;
    const nuevoEstado =
      totalPreguntas > 0 && totalRespondidas >= totalPreguntas
        ? "completada"
        : aud.estado === "vencida"
          ? "vencida"
          : "en_progreso";

    await capDb.query("UPDATE auditorias SET estado = ? WHERE id_auditoria = ?", [
      nuevoEstado,
      idAuditoria,
    ]);

    return jsonOk(
      { id_auditoria: Number(idAuditoria), estado: nuevoEstado, respondidas: totalRespondidas },
      nuevoEstado === "completada"
        ? "Auditoría completada correctamente"
        : "Progreso guardado",
    );
  } catch (error) {
    return jsonError("Error al guardar respuestas", 500, error.message);
  }
}
