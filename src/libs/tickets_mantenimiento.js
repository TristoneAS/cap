import { capDb } from "@/libs/cap_db";

/**
 * Un ticket por área + sub área + periodo_mes; incluye todos los hallazgos Poka Yoke (No) del mes.
 */
export async function sincronizarTicketsDesdePoka(idAuditoria, db = capDb) {
  const idAud = Number(idAuditoria);
  if (!idAud) return { ticketId: null, items: 0 };

  const [audRows] = await db.query(
    `SELECT id_area, id_sub_area, periodo_mes FROM auditorias WHERE id_auditoria = ?`,
    [idAud],
  );
  if (!audRows.length) return { ticketId: null, items: 0 };

  const { id_area, id_sub_area, periodo_mes } = audRows[0];

  const [negativas] = await db.query(
    `SELECT r.id_respuesta, r.id_auditoria, r.emp_id_responsable, r.emp_nombre_responsable
     FROM auditoria_poka_yoke_respuestas r
     INNER JOIN auditorias aud ON aud.id_auditoria = r.id_auditoria
     INNER JOIN auditoria_poka_yoke apk ON apk.id_auditoria = aud.id_auditoria AND apk.exenta = 'no'
     WHERE aud.id_area = ?
       AND aud.id_sub_area = ?
       AND aud.periodo_mes = ?
       AND r.cumple = 'no'`,
    [id_area, id_sub_area, periodo_mes],
  );

  if (!negativas.length) {
    await db.query(
      `UPDATE tickets_mantenimiento
       SET estado = 'cancelado', fecha_modificacion = NOW()
       WHERE id_area = ? AND id_sub_area = ? AND periodo_mes = ?
         AND estado IN ('abierto', 'en_proceso')`,
      [id_area, id_sub_area, periodo_mes],
    );
    return { ticketId: null, items: 0 };
  }

  const ref = negativas[0];
  await db.query(
    `INSERT INTO tickets_mantenimiento
     (id_area, id_sub_area, periodo_mes, estado, emp_id_asignado, emp_nombre_asignado)
     VALUES (?, ?, ?, 'abierto', ?, ?)
     ON DUPLICATE KEY UPDATE
       emp_id_asignado = COALESCE(VALUES(emp_id_asignado), emp_id_asignado),
       emp_nombre_asignado = COALESCE(VALUES(emp_nombre_asignado), emp_nombre_asignado),
       fecha_modificacion = NOW(),
       estado = IF(estado IN ('cancelado', 'resuelto', 'cerrado'), 'abierto', estado),
       fecha_resolucion = IF(estado IN ('cancelado', 'resuelto', 'cerrado'), NULL, fecha_resolucion),
       notas_resolucion = IF(estado IN ('cancelado', 'resuelto', 'cerrado'), NULL, notas_resolucion),
       fecha_cierre = IF(estado IN ('cancelado', 'resuelto', 'cerrado'), NULL, fecha_cierre),
       notas_cierre = IF(estado IN ('cancelado', 'resuelto', 'cerrado'), NULL, notas_cierre)`,
    [
      id_area,
      id_sub_area,
      periodo_mes,
      ref.emp_id_responsable,
      ref.emp_nombre_responsable,
    ],
  );

  const [ticketRows] = await db.query(
    `SELECT id_ticket FROM tickets_mantenimiento
     WHERE id_area = ? AND id_sub_area = ? AND periodo_mes = ?`,
    [id_area, id_sub_area, periodo_mes],
  );
  const idTicket = ticketRows[0]?.id_ticket;
  if (!idTicket) return { ticketId: null, items: 0 };

  for (const row of negativas) {
    await db.query(
      `INSERT INTO ticket_mantenimiento_items (id_ticket, id_respuesta_poka, id_auditoria)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         id_ticket = VALUES(id_ticket),
         id_auditoria = VALUES(id_auditoria)`,
      [idTicket, row.id_respuesta, row.id_auditoria],
    );
  }

  const ids = negativas.map((n) => n.id_respuesta);
  const placeholders = ids.map(() => "?").join(",");
  await db.query(
    `DELETE FROM ticket_mantenimiento_items
     WHERE id_ticket = ? AND id_respuesta_poka NOT IN (${placeholders})`,
    [idTicket, ...ids],
  );

  return { ticketId: idTicket, items: negativas.length };
}

export const TICKET_ESTADOS = [
  "abierto",
  "en_proceso",
  "resuelto",
  "cancelado",
  "cerrado",
];

/** Estados que Mantenimiento puede asignar (no cierra el ticket). */
export const TICKET_ESTADOS_MANTENIMIENTO = ["abierto", "en_proceso", "resuelto"];

const TICKET_LIST_SELECT = `
  SELECT t.id_ticket, t.id_area, t.id_sub_area, t.periodo_mes, t.estado,
         t.emp_id_asignado, t.emp_nombre_asignado, t.notas_resolucion, t.notas_cierre,
         t.fecha_creacion, t.fecha_modificacion, t.fecha_resolucion, t.fecha_cierre,
         a.nombre AS area_nombre, sa.nombre AS sub_area_nombre,
         COUNT(i.id_item) AS total_hallazgos
  FROM tickets_mantenimiento t
  INNER JOIN areas a ON a.id_area = t.id_area
  INNER JOIN sub_areas sa ON sa.id_sub_area = t.id_sub_area
  LEFT JOIN ticket_mantenimiento_items i ON i.id_ticket = t.id_ticket
`;

export async function listTickets(
  { estado = "", conDetalle = false, limit = 100 } = {},
  db = capDb,
) {
  const lim = Math.min(Math.max(Number(limit) || 100, 1), 200);
  let sql = `${TICKET_LIST_SELECT} WHERE 1=1`;
  const params = [];

  if (estado && TICKET_ESTADOS.includes(estado)) {
    sql += " AND t.estado = ?";
    params.push(estado);
  } else if (estado === "activos") {
    sql += " AND t.estado IN ('abierto', 'en_proceso')";
  } else if (estado === "pendientes_procesos") {
    sql += " AND t.estado = 'resuelto'";
  }

  sql += `
    GROUP BY t.id_ticket, t.id_area, t.id_sub_area, t.periodo_mes, t.estado,
             t.emp_id_asignado, t.emp_nombre_asignado, t.notas_resolucion, t.notas_cierre,
             t.fecha_creacion, t.fecha_modificacion, t.fecha_resolucion, t.fecha_cierre,
             a.nombre, sa.nombre
    ORDER BY t.fecha_modificacion DESC, t.id_ticket DESC
    LIMIT ?
  `;
  params.push(lim);

  const [rows] = await db.query(sql, params);

  if (!conDetalle || !rows.length) return rows;

  const ids = rows.map((r) => r.id_ticket);
  const placeholders = ids.map(() => "?").join(",");
  const [items] = await db.query(
    `${ITEMS_SELECT} WHERE i.id_ticket IN (${placeholders})
     ORDER BY i.id_ticket ASC, i.id_item ASC`,
    ids,
  );

  const byTicket = items.reduce((acc, row) => {
    const key = String(row.id_ticket);
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  return rows.map((r) => ({
    ...r,
    hallazgos: byTicket[String(r.id_ticket)] || [],
  }));
}

export function validarActualizacionMantenimiento(estadoActual, estadoNuevo) {
  if (["resuelto", "cerrado", "cancelado"].includes(estadoActual)) {
    return {
      ok: false,
      error:
        "Este ticket ya fue marcado como resuelto y está en Procesos o cerrado. Mantenimiento no puede modificarlo.",
    };
  }
  if (!TICKET_ESTADOS_MANTENIMIENTO.includes(estadoNuevo)) {
    return {
      ok: false,
      error: "Mantenimiento solo puede usar Abierto, En proceso o Resuelto.",
    };
  }
  return { ok: true };
}

export function validarCierreProcesos(estadoActual, estadoNuevo) {
  if (estadoNuevo !== "cerrado") {
    return { ok: false, error: "Procesos solo puede cerrar el ticket (estado Cerrado)." };
  }
  if (estadoActual !== "resuelto") {
    return {
      ok: false,
      error: "Solo se pueden cerrar tickets que Mantenimiento marcó como Resuelto.",
    };
  }
  return { ok: true };
}

export async function actualizarTicketMantenimiento(
  idTicket,
  { estado, notas_resolucion },
  db = capDb,
) {
  const [existing] = await db.query(
    "SELECT id_ticket, estado FROM tickets_mantenimiento WHERE id_ticket = ?",
    [idTicket],
  );
  if (!existing.length) return { error: "Ticket no encontrado", status: 404 };

  const estadoActual = existing[0].estado;
  const estadoNuevo = estado || estadoActual;
  const val = validarActualizacionMantenimiento(estadoActual, estadoNuevo);
  if (!val.ok) return { error: val.error, status: 400 };

  const notas = String(notas_resolucion ?? "").trim() || null;
  const fechaResolucion =
    estadoNuevo === "resuelto" ? new Date() : estadoNuevo === "abierto" ? null : undefined;

  if (fechaResolucion === null) {
    await db.query(
      `UPDATE tickets_mantenimiento
       SET estado = ?, notas_resolucion = ?, fecha_resolucion = NULL, fecha_modificacion = NOW()
       WHERE id_ticket = ?`,
      [estadoNuevo, notas, idTicket],
    );
  } else if (fechaResolucion) {
    await db.query(
      `UPDATE tickets_mantenimiento
       SET estado = ?, notas_resolucion = ?, fecha_resolucion = ?, fecha_modificacion = NOW()
       WHERE id_ticket = ?`,
      [estadoNuevo, notas, fechaResolucion, idTicket],
    );
  } else {
    await db.query(
      `UPDATE tickets_mantenimiento
       SET estado = ?, notas_resolucion = ?, fecha_modificacion = NOW()
       WHERE id_ticket = ?`,
      [estadoNuevo, notas, idTicket],
    );
  }

  return { ok: true, estado: estadoNuevo };
}

export async function cerrarTicketProcesos(
  idTicket,
  { notas_cierre },
  db = capDb,
) {
  const [existing] = await db.query(
    "SELECT id_ticket, estado FROM tickets_mantenimiento WHERE id_ticket = ?",
    [idTicket],
  );
  if (!existing.length) return { error: "Ticket no encontrado", status: 404 };

  const estadoActual = existing[0].estado;
  const val = validarCierreProcesos(estadoActual, "cerrado");
  if (!val.ok) return { error: val.error, status: 400 };

  const notas = String(notas_cierre ?? "").trim() || null;
  const ahora = new Date();

  await db.query(
    `UPDATE tickets_mantenimiento
     SET estado = 'cerrado', notas_cierre = ?, fecha_cierre = ?, fecha_modificacion = NOW()
     WHERE id_ticket = ?`,
    [notas, ahora, idTicket],
  );

  return { ok: true, estado: "cerrado" };
}

export const ITEMS_SELECT = `
  SELECT i.id_item, i.id_ticket, i.id_respuesta_poka, i.id_auditoria,
         r.hallazgo, r.cumple,
         p.texto AS pregunta_poka,
         nc.nombre AS tipo_nc_nombre,
         ac.nombre AS accion_nombre,
         r.emp_id_responsable, r.emp_nombre_responsable,
         aud.turno, aud.emp_nombre AS auditor_nombre
  FROM ticket_mantenimiento_items i
  INNER JOIN auditoria_poka_yoke_respuestas r ON r.id_respuesta = i.id_respuesta_poka
  INNER JOIN preguntas_poka_yoke p ON p.id_pregunta_poka = r.id_pregunta_poka
  LEFT JOIN tipos_no_conformidad nc ON nc.id_tipo_nc = r.id_tipo_nc
  LEFT JOIN acciones ac ON ac.id_accion = r.id_accion
  INNER JOIN auditorias aud ON aud.id_auditoria = i.id_auditoria
`;
