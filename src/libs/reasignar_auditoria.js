import { capDb } from "@/libs/cap_db";
import { fechaVencimientoPeriodo } from "@/libs/auditoria_fechas";
import { loadTurnosPorSubArea } from "@/libs/turnos_db";

const AUDITORIA_SELECT = `
  SELECT aud.id_auditoria, aud.id_area, aud.id_sub_area, aud.id_tipo_auditoria,
         aud.emp_id, aud.emp_nombre, aud.periodo_mes, aud.turno, aud.estado,
         aud.fecha_programada, aud.comentario,
         a.nombre AS area_nombre, sa.nombre AS sub_area_nombre,
         t.nombre AS tipo_nombre
  FROM auditorias aud
  INNER JOIN areas a ON a.id_area = aud.id_area
  INNER JOIN sub_areas sa ON sa.id_sub_area = aud.id_sub_area
  INNER JOIN tipos_auditoria t ON t.id_tipo_auditoria = aud.id_tipo_auditoria
  WHERE aud.id_auditoria = ?
`;

async function contarRespuestas(db, idAuditoria) {
  const [rows] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM auditoria_respuestas WHERE id_auditoria = ? AND cumple IS NOT NULL) +
       (SELECT COUNT(*) FROM auditoria_poka_yoke_respuestas WHERE id_auditoria = ? AND cumple IS NOT NULL) +
       (SELECT COUNT(*) FROM auditoria_poka_yoke WHERE id_auditoria = ? AND exenta IS NOT NULL) AS total`,
    [idAuditoria, idAuditoria, idAuditoria],
  );
  return Number(rows[0]?.total || 0);
}

async function validarComboConPreguntas(db, idTipo, idArea, idSubArea) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM preguntas p
     INNER JOIN pregunta_alcance pa
       ON pa.id_pregunta = p.id_pregunta AND pa.estado = 'activo'
     WHERE p.estado = 'activo'
       AND p.id_tipo_auditoria = ?
       AND pa.id_area = ?
       AND pa.id_sub_area = ?`,
    [idTipo, idArea, idSubArea],
  );
  return Number(rows[0]?.total || 0) > 0;
}

async function validarTurnoEnSubArea(db, idSubArea, turno) {
  const turnos = await loadTurnosPorSubArea(db, idSubArea);
  return turnos.some((t) => String(t.codigo).toUpperCase() === String(turno).toUpperCase());
}

/**
 * Elimina la auditoría sin respuestas y crea una nueva asignación en el mismo periodo.
 * La auditoría anterior deja de existir (no cuenta en reportes del mes).
 */
export async function reasignarAuditoria(idAuditoria, nuevoSlot, db = capDb) {
  const id_area = Number(nuevoSlot.id_area);
  const id_sub_area = Number(nuevoSlot.id_sub_area);
  const id_tipo_auditoria = Number(nuevoSlot.id_tipo_auditoria);
  const turno = String(nuevoSlot.turno ?? "")
    .trim()
    .toUpperCase();

  if (!id_area || !id_sub_area || !id_tipo_auditoria || !turno) {
    return {
      ok: false,
      status: 400,
      error: "Área, sub área, tipo de auditoría y turno son requeridos",
    };
  }

  const [auditorias] = await db.query(AUDITORIA_SELECT, [idAuditoria]);
  if (!auditorias.length) {
    return { ok: false, status: 404, error: "Auditoría no encontrada" };
  }

  const aud = auditorias[0];
  const estado = String(aud.estado || "").toLowerCase();

  if (estado === "completada" || estado === "cancelada") {
    return {
      ok: false,
      status: 409,
      error: "No se puede reasignar una auditoría completada o cancelada",
    };
  }

  const respondidas = await contarRespuestas(db, idAuditoria);
  if (respondidas > 0) {
    return {
      ok: false,
      status: 409,
      error:
        "No se puede reasignar: la auditoría ya tiene respuestas guardadas. Solo se permite si aún no se ha respondido nada.",
    };
  }

  const [areaOk] = await db.query(
    "SELECT id_area FROM areas WHERE id_area = ? AND estado = 'activo'",
    [id_area],
  );
  const [subOk] = await db.query(
    "SELECT id_sub_area FROM sub_areas WHERE id_sub_area = ? AND id_area = ? AND estado = 'activo'",
    [id_sub_area, id_area],
  );
  const [tipoOk] = await db.query(
    "SELECT id_tipo_auditoria FROM tipos_auditoria WHERE id_tipo_auditoria = ? AND estado = 'activo'",
    [id_tipo_auditoria],
  );

  if (!areaOk.length || !subOk.length || !tipoOk.length) {
    return { ok: false, status: 400, error: "Área, sub área o tipo no válidos" };
  }

  if (!(await validarTurnoEnSubArea(db, id_sub_area, turno))) {
    return {
      ok: false,
      status: 400,
      error: "El turno seleccionado no está asignado a esa sub área",
    };
  }

  if (!(await validarComboConPreguntas(db, id_tipo_auditoria, id_area, id_sub_area))) {
    return {
      ok: false,
      status: 400,
      error: "No hay preguntas activas para esa área, sub área y tipo de auditoría",
    };
  }

  const mismoSlot =
    Number(aud.id_area) === id_area &&
    Number(aud.id_sub_area) === id_sub_area &&
    Number(aud.id_tipo_auditoria) === id_tipo_auditoria &&
    String(aud.turno).toUpperCase() === turno;

  if (mismoSlot) {
    return {
      ok: false,
      status: 400,
      error: "La nueva asignación es igual a la actual",
    };
  }

  const [duplicada] = await db.query(
    `SELECT id_auditoria FROM auditorias
     WHERE id_sub_area = ? AND id_tipo_auditoria = ? AND periodo_mes = ?
       AND emp_id = ? AND turno = ? AND id_auditoria != ?`,
    [id_sub_area, id_tipo_auditoria, aud.periodo_mes, aud.emp_id, turno, idAuditoria],
  );
  if (duplicada.length) {
    return {
      ok: false,
      status: 409,
      error: "El auditor ya tiene esa auditoría asignada en el mismo periodo y turno",
    };
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query("DELETE FROM auditoria_poka_yoke_respuestas WHERE id_auditoria = ?", [
      idAuditoria,
    ]);
    await conn.query("DELETE FROM auditoria_poka_yoke WHERE id_auditoria = ?", [idAuditoria]);
    await conn.query("DELETE FROM auditoria_respuestas WHERE id_auditoria = ?", [
      idAuditoria,
    ]);
    await conn.query("DELETE FROM auditorias WHERE id_auditoria = ?", [idAuditoria]);

    const [insert] = await conn.query(
      `INSERT INTO auditorias
       (id_area, id_sub_area, id_tipo_auditoria, emp_id, emp_nombre, periodo_mes, turno, fecha_programada, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      [
        id_area,
        id_sub_area,
        id_tipo_auditoria,
        aud.emp_id,
        aud.emp_nombre,
        aud.periodo_mes,
        turno,
        aud.fecha_programada || fechaVencimientoPeriodo(aud.periodo_mes),
      ],
    );

    await conn.commit();

    const [nueva] = await db.query(AUDITORIA_SELECT, [insert.insertId]);

    return {
      ok: true,
      status: 200,
      data: {
        id_auditoria_anterior: Number(idAuditoria),
        id_auditoria_nueva: insert.insertId,
        auditoria: nueva[0],
        eliminada: {
          id_auditoria: Number(idAuditoria),
          area_nombre: aud.area_nombre,
          sub_area_nombre: aud.sub_area_nombre,
          tipo_nombre: aud.tipo_nombre,
          turno: aud.turno,
        },
      },
      message: `Auditoría reasignada. Se eliminó la asignación anterior (${aud.area_nombre} · ${aud.sub_area_nombre} · Turno ${aud.turno}).`,
    };
  } catch (error) {
    await conn.rollback();
    if (error.code === "ER_DUP_ENTRY") {
      return {
        ok: false,
        status: 409,
        error: "Ya existe otra auditoría con esa combinación para el periodo",
      };
    }
    throw error;
  } finally {
    conn.release();
  }
}

export async function puedeReasignarAuditoria(idAuditoria, db = capDb) {
  const [auditorias] = await db.query(
    "SELECT id_auditoria, estado FROM auditorias WHERE id_auditoria = ?",
    [idAuditoria],
  );
  if (!auditorias.length) {
    return { ok: false, motivo: "Auditoría no encontrada" };
  }

  const estado = String(auditorias[0].estado || "").toLowerCase();
  if (estado === "completada" || estado === "cancelada") {
    return { ok: false, motivo: "Auditoría cerrada" };
  }

  const respondidas = await contarRespuestas(db, idAuditoria);
  if (respondidas > 0) {
    return {
      ok: false,
      motivo: "Ya tiene respuestas guardadas",
    };
  }

  return { ok: true };
}
