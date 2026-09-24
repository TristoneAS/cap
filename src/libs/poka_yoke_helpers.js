import { capDb } from "@/libs/cap_db";
import { calcularPorcentajeCumplimiento } from "@/libs/auditoria_score";

export async function countPreguntasPokaActivas(db = capDb) {
  const [rows] = await db.query(
    "SELECT COUNT(*) AS total FROM preguntas_poka_yoke WHERE estado = 'activo'",
  );
  return Number(rows[0]?.total || 0);
}

export async function fetchExentaPoka(idAuditoria, db = capDb) {
  const [rows] = await db.query(
    "SELECT exenta FROM auditoria_poka_yoke WHERE id_auditoria = ?",
    [idAuditoria],
  );
  const exenta = rows[0]?.exenta;
  return exenta === "si" || exenta === "no" ? exenta : null;
}

export async function buildPokaChecklist(idAuditoria, cerrada, db = capDb) {
  const exenta = await fetchExentaPoka(idAuditoria, db);

  const [respuestas] = await db.query(
    `SELECT apr.id_respuesta, apr.id_pregunta_poka, apr.cumple, apr.hallazgo, apr.id_tipo_nc,
            apr.id_accion, apr.emp_id_responsable, apr.emp_nombre_responsable,
            ac.nombre AS accion_nombre,
            nc.nombre AS tipo_nc_nombre
     FROM auditoria_poka_yoke_respuestas apr
     LEFT JOIN acciones ac ON ac.id_accion = apr.id_accion
     LEFT JOIN tipos_no_conformidad nc ON nc.id_tipo_nc = apr.id_tipo_nc
     WHERE apr.id_auditoria = ?`,
    [idAuditoria],
  );
  const respByPregunta = Object.fromEntries(
    respuestas.map((r) => [r.id_pregunta_poka, r]),
  );

  let preguntas;
  if (cerrada && exenta === "no") {
    const [rows] = await db.query(
      `SELECT p.id_pregunta_poka, p.texto, p.id_tipo_nc, p.estado,
              nc.nombre AS tipo_nc_nombre
       FROM auditoria_poka_yoke_respuestas apr
       INNER JOIN preguntas_poka_yoke p ON p.id_pregunta_poka = apr.id_pregunta_poka
       INNER JOIN tipos_no_conformidad nc ON nc.id_tipo_nc = p.id_tipo_nc
       WHERE apr.id_auditoria = ? AND apr.cumple IS NOT NULL
       ORDER BY p.id_pregunta_poka ASC`,
      [idAuditoria],
    );
    preguntas = rows;
  } else {
    const [rows] = await db.query(
      `SELECT p.id_pregunta_poka, p.texto, p.id_tipo_nc, p.estado,
              nc.nombre AS tipo_nc_nombre
       FROM preguntas_poka_yoke p
       INNER JOIN tipos_no_conformidad nc ON nc.id_tipo_nc = p.id_tipo_nc
       WHERE p.estado = 'activo'
       ORDER BY p.id_pregunta_poka ASC`,
    );
    preguntas = rows;
  }

  const checklist = preguntas.map((p) => ({
    ...p,
    respuesta: respByPregunta[p.id_pregunta_poka] || null,
  }));

  const total_preguntas = exenta === "no" ? checklist.length : 0;
  const respuestas_si = checklist.filter((p) => p.respuesta?.cumple === "si").length;
  const respondidas = checklist.filter((p) => p.respuesta?.cumple).length;
  const porcentaje =
    exenta === "no" && total_preguntas > 0 && respondidas >= total_preguntas
      ? calcularPorcentajeCumplimiento({
          totalPreguntas: total_preguntas,
          respuestasSi: respuestas_si,
        })
      : null;

  return {
    exenta,
    preguntas: exenta === "no" ? checklist : [],
    total_preguntas,
    respondidas,
    respuestas_si,
    porcentaje,
  };
}

async function validarItemNoConforme(item, db) {
  const cumple = item.cumple === "si" || item.cumple === "no" ? item.cumple : null;
  if (!cumple) return { error: "Cada pregunta Poka Yoke debe tener respuesta Sí o No" };

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
    emp_nombre_responsable = String(item.emp_nombre_responsable ?? "").trim() || null;

    if (!hallazgo) {
      return { error: "Indique el hallazgo en Poka Yoke cuando la respuesta es No" };
    }
    if (!id_tipo_nc) {
      return { error: "Seleccione el tipo de no conformidad en Poka Yoke cuando la respuesta es No" };
    }
    if (!id_accion) {
      return { error: "Seleccione una acción en Poka Yoke cuando la respuesta es No" };
    }
    if (!emp_id_responsable) {
      return { error: "Seleccione un responsable en Poka Yoke cuando la respuesta es No" };
    }

    const [tipoNc] = await db.query(
      "SELECT id_tipo_nc FROM tipos_no_conformidad WHERE id_tipo_nc = ? AND estado = 'activo'",
      [id_tipo_nc],
    );
    if (!tipoNc.length) return { error: "Tipo de no conformidad no válido (Poka Yoke)" };

    const [accion] = await db.query(
      "SELECT id_accion FROM acciones WHERE id_accion = ? AND estado = 'activo'",
      [id_accion],
    );
    if (!accion.length) return { error: "Acción no válida (Poka Yoke)" };
  }

  return {
    data: {
      id_pregunta_poka: Number(item.id_pregunta_poka),
      cumple,
      hallazgo,
      id_tipo_nc,
      id_accion,
      emp_id_responsable,
      emp_nombre_responsable,
    },
  };
}

/**
 * Guarda exención y respuestas Poka Yoke (separado de auditoria_respuestas).
 */
export async function guardarPokaYoke(idAuditoria, pokaPayload, db = capDb) {
  if (!pokaPayload || typeof pokaPayload !== "object") {
    return { error: "Debe indicar si el área está exenta de Poka Yoke (Sí o No)", status: 400 };
  }

  const exenta =
    pokaPayload.exenta === "si" || pokaPayload.exenta === "no" ? pokaPayload.exenta : null;
  if (!exenta) {
    return {
      error:
        "Responda la pregunta de exención Poka Yoke: ¿El área está exenta de dispositivos Poka Yoke aplicables al proceso?",
      status: 400,
    };
  }

  await db.query(
    `INSERT INTO auditoria_poka_yoke (id_auditoria, exenta)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE exenta = VALUES(exenta)`,
    [idAuditoria, exenta],
  );

  if (exenta === "si") {
    await db.query("DELETE FROM auditoria_poka_yoke_respuestas WHERE id_auditoria = ?", [
      idAuditoria,
    ]);
    return { ok: true, exenta };
  }

  const respuestas = Array.isArray(pokaPayload.respuestas) ? pokaPayload.respuestas : [];
  const [activas] = await db.query(
    "SELECT id_pregunta_poka FROM preguntas_poka_yoke WHERE estado = 'activo'",
  );
  const idsActivos = new Set(activas.map((r) => Number(r.id_pregunta_poka)));

  for (const item of respuestas) {
    const idPoka = Number(item.id_pregunta_poka);
    if (!idPoka || !idsActivos.has(idPoka)) {
      return { error: "Pregunta Poka Yoke no válida", status: 400 };
    }
    const validacion = await validarItemNoConforme(item, db);
    if (validacion.error) return { error: validacion.error, status: 400 };

    const d = validacion.data;
    await db.query(
      `INSERT INTO auditoria_poka_yoke_respuestas
       (id_auditoria, id_pregunta_poka, cumple, hallazgo, id_tipo_nc, id_accion, emp_id_responsable, emp_nombre_responsable)
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
        d.id_pregunta_poka,
        d.cumple,
        d.hallazgo,
        d.id_tipo_nc,
        d.id_accion,
        d.emp_id_responsable,
        d.emp_nombre_responsable,
      ],
    );
  }

  return { ok: true, exenta };
}

export async function pokaCumpleParaCompletar(idAuditoria, db = capDb) {
  const exenta = await fetchExentaPoka(idAuditoria, db);
  if (!exenta) return false;

  if (exenta === "si") return true;

  const totalActivas = await countPreguntasPokaActivas(db);
  if (totalActivas === 0) return true;

  const [respondidas] = await db.query(
    `SELECT COUNT(*) AS total FROM auditoria_poka_yoke_respuestas
     WHERE id_auditoria = ? AND cumple IS NOT NULL`,
    [idAuditoria],
  );
  return Number(respondidas[0]?.total || 0) >= totalActivas;
}
