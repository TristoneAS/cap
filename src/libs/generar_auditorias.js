import { capDb } from "@/libs/cap_db";
import { fechaVencimientoPeriodo, periodoMesPlanta } from "@/libs/auditoria_fechas";
import { notificarUsuariosAuditoriasAsignadas } from "@/libs/notificar_usuarios_auditorias";
import { getSmtpConfig } from "@/libs/mailer";
import { getTurnosCodigosPorSubArea } from "@/libs/turnos_db";


function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Clave única de slot: sub área + tipo + turno (sin auditor). */
function slotKey(slot) {
  return `${slot.sub.id_sub_area}|${slot.tipo.id_tipo_auditoria}|${slot.turno}`;
}

async function loadNivelRequeridoPorArea() {
  try {
    const [rows] = await capDb.query(
      `SELECT id_area, id_nivel_usuario
       FROM areas
       WHERE estado = 'activo' AND id_nivel_usuario IS NOT NULL`,
    );
    return new Map(
      rows.map((r) => [Number(r.id_area), Number(r.id_nivel_usuario)]),
    );
  } catch {
    return new Map();
  }
}

function slotValidoParaUsuario(slot, user, areaNivelById) {
  if (String(slot.id_nivel_usuario) !== String(user.id_nivel_usuario)) {
    return false;
  }
  const areaNivel = areaNivelById.get(Number(slot.sub.id_area));
  if (areaNivel != null && Number(user.id_nivel_usuario) !== Number(areaNivel)) {
    return false;
  }
  return true;
}

/**
 * Una auditoría por usuario en el mes.
 * Si hay más usuarios que slots, reparte lo más parejo posible (p. ej. 100 usuarios / 50 slots → 2 por slot).
 */
function asignarUnaAuditoriaPorUsuario(usuarios, slots, areaNivelById) {
  if (!usuarios.length || !slots.length) return [];

  const slotsShuffled = shuffle(slots);
  const slotUseCount = new Map();
  for (const s of slotsShuffled) {
    slotUseCount.set(slotKey(s), 0);
  }

  // Primero quienes tienen menos slots válidos (evita amontonar al final en pocos slots).
  const users = shuffle(usuarios)
    .map((user) => ({
      user,
      validCount: slotsShuffled.filter((s) =>
        slotValidoParaUsuario(s, user, areaNivelById),
      ).length,
    }))
    .sort((a, b) => a.validCount - b.validCount)
    .map((row) => row.user);

  const assignments = [];

  for (const user of users) {
    const candidatos = slotsShuffled.filter((s) =>
      slotValidoParaUsuario(s, user, areaNivelById),
    );
    if (!candidatos.length) continue;

    let minUse = Infinity;
    for (const s of candidatos) {
      const c = slotUseCount.get(slotKey(s)) || 0;
      if (c < minUse) minUse = c;
    }

    const best = candidatos.filter(
      (s) => (slotUseCount.get(slotKey(s)) || 0) === minUse,
    );
    const slot = best[Math.floor(Math.random() * best.length)];

    assignments.push({ slot, user });
    const sk = slotKey(slot);
    slotUseCount.set(sk, (slotUseCount.get(sk) || 0) + 1);
  }

  return assignments;
}

async function empIdsConAuditoriaEnPeriodo(periodo) {
  const [rows] = await capDb.query(
    `SELECT DISTINCT emp_id FROM auditorias WHERE periodo_mes = ?`,
    [periodo],
  );
  return new Set(rows.map((r) => String(r.emp_id).trim()));
}

function resumenRepartoSlots(assignments) {
  const counts = new Map();
  for (const { slot } of assignments) {
    const k = slotKey(slot);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const valores = [...counts.values()];
  if (!valores.length) {
    return { slots_con_auditor: 0, min_por_slot: 0, max_por_slot: 0, slots_compartidos: 0 };
  }
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  return {
    slots_con_auditor: valores.length,
    min_por_slot: min,
    max_por_slot: max,
    slots_compartidos: valores.filter((n) => n > 1).length,
  };
}

async function resumenGeneracionPeriodo(periodo) {
  const [rows] = await capDb.query(
    `SELECT periodo_mes, fecha_generacion, creadas, omitidas, automatica
     FROM auditorias_generacion_mes WHERE periodo_mes = ?`,
    [periodo],
  );
  const row = rows[0] || null;
  if (row && Number(row.creadas) === 0 && Number(row.omitidas) === 0) {
    await liberarGeneracionPeriodo(periodo);
    return null;
  }
  return row;
}

async function verificarGeneracionPeriodo(periodo, { forzar = false } = {}) {
  if (forzar) return { ok: true };

  const previo = await resumenGeneracionPeriodo(periodo);
  if (previo) {
    return {
      ok: false,
      status: 409,
      error: `Ya se generaron las auditorías del periodo ${periodo}. Solo se permite una generación por mes.`,
      data: { periodo_mes: periodo, ya_generado: true, generacion: previo },
    };
  }

  return { ok: true };
}

async function registrarGeneracionPeriodo(
  periodo,
  { creadas, omitidas, automatica = false },
) {
  await capDb.query(
    `INSERT INTO auditorias_generacion_mes (periodo_mes, creadas, omitidas, automatica)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       creadas = VALUES(creadas),
       omitidas = VALUES(omitidas),
       automatica = VALUES(automatica),
       fecha_generacion = CURRENT_TIMESTAMP`,
    [periodo, creadas, omitidas, automatica ? 1 : 0],
  );
}

/** Quita bloqueo del periodo si la generación no terminó bien (p. ej. error previo). */
async function liberarGeneracionPeriodo(periodo) {
  await capDb.query(`DELETE FROM auditorias_generacion_mes WHERE periodo_mes = ?`, [
    periodo,
  ]);
}

export async function consultarGeneracionPeriodo(periodo_mes) {
  const periodo = String(periodo_mes ?? periodoMesPlanta()).trim();
  const generacion = await resumenGeneracionPeriodo(periodo);
  return {
    periodo_mes: periodo,
    ya_generado: Boolean(generacion),
    generacion,
  };
}

/**
 * Genera auditorías del mes (misma lógica que el botón en pantalla).
 * @param {string} [periodo_mes] YYYY-MM; default mes actual (zona planta).
 * @param {{ forzar?: boolean, automatica?: boolean }} [opts]
 */
export async function generarAuditoriasMes(
  periodo_mes = periodoMesPlanta(),
  opts = {},
) {
  const { forzar = false, automatica = false, enviarCorreos = true } = opts;
  const periodo = String(periodo_mes ?? periodoMesPlanta()).trim();
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    return {
      ok: false,
      status: 400,
      error: "periodo_mes inválido (YYYY-MM)",
    };
  }

  const bloqueo = await verificarGeneracionPeriodo(periodo, { forzar });
  if (!bloqueo.ok) {
    return bloqueo;
  }

  try {
  const areaNivelById = await loadNivelRequeridoPorArea();

  const [combos] = await capDb.query(
    `SELECT
        pa.id_area,
        pa.id_sub_area,
        p.id_tipo_auditoria,
        a.nombre AS area_nombre,
        sa.nombre AS sub_area_nombre,
        t.nombre AS tipo_nombre,
        t.id_nivel_usuario,
        COUNT(p.id_pregunta) AS num_preguntas
     FROM preguntas p
     INNER JOIN pregunta_alcance pa
       ON pa.id_pregunta = p.id_pregunta AND pa.estado = 'activo'
     INNER JOIN areas a
       ON a.id_area = pa.id_area AND a.estado = 'activo'
     INNER JOIN sub_areas sa
       ON sa.id_sub_area = pa.id_sub_area AND sa.estado = 'activo'
     INNER JOIN tipos_auditoria t
       ON t.id_tipo_auditoria = p.id_tipo_auditoria AND t.estado = 'activo'
     INNER JOIN niveles_usuario nu
       ON nu.id_nivel_usuario = t.id_nivel_usuario AND nu.estado = 'activo'
     WHERE p.estado = 'activo'
     GROUP BY pa.id_area, pa.id_sub_area, p.id_tipo_auditoria,
              a.nombre, sa.nombre, t.nombre, t.id_nivel_usuario
     HAVING COUNT(p.id_pregunta) > 0`,
  );

  if (!combos.length) {
    return {
      ok: false,
      status: 400,
      error:
        "No hay preguntas activas. Configure preguntas por área, sub área y tipo antes de generar.",
    };
  }

  const [usuariosCap] = await capDb.query(
    `SELECT u.emp_id, u.emp_nombre, u.emp_apellido_paterno, u.emp_apellido_materno,
            u.id_nivel_usuario
     FROM usuarios u
     WHERE u.estado = 'activo'
     ORDER BY u.emp_nombre ASC`,
  );

  const empleadosList = usuariosCap.map((u) => ({
    emp_id: u.emp_id,
    emp_nombre: [u.emp_nombre, u.emp_apellido_paterno, u.emp_apellido_materno]
      .filter(Boolean)
      .join(" ")
      .trim(),
    emp_alias: "",
    id_nivel_usuario: u.id_nivel_usuario,
  }));

  if (!empleadosList.length) {
    return {
      ok: false,
      status: 400,
      error:
        "No hay usuarios registrados en CAP. Registre usuarios con su nivel antes de generar auditorías.",
    };
  }

  const usuariosPorNivel = empleadosList.reduce((acc, emp) => {
    const key = String(emp.id_nivel_usuario);
    if (!acc[key]) acc[key] = [];
    acc[key].push(emp);
    return acc;
  }, {});

  const combosConAuditor = combos.filter(
    (c) => (usuariosPorNivel[String(c.id_nivel_usuario)] || []).length > 0,
  );

  if (!combosConAuditor.length) {
    return {
      ok: false,
      status: 400,
      error:
        "Ninguna combinación área/sub área/tipo tiene usuarios del nivel requerido. Revise niveles de tipos y usuarios.",
    };
  }

  const turnosPorSubArea = await getTurnosCodigosPorSubArea();
  const combosSinTurnos = combosConAuditor.filter(
    (c) => !(turnosPorSubArea.get(Number(c.id_sub_area)) || []).length,
  );
  if (combosSinTurnos.length === combosConAuditor.length) {
    return {
      ok: false,
      status: 400,
      error:
        "Ninguna sub área tiene turnos asignados. Configure turnos en Sub áreas antes de generar auditorías.",
    };
  }

  const shuffledCombos = shuffle(combosConAuditor);
  const slots = [];
  for (const combo of shuffledCombos) {
    const areaNivel = areaNivelById.get(Number(combo.id_area));
    if (
      areaNivel != null &&
      Number(combo.id_nivel_usuario) !== Number(areaNivel)
    ) {
      continue;
    }
    const turnos = turnosPorSubArea.get(Number(combo.id_sub_area)) || [];
    if (!turnos.length) {
      continue;
    }
    for (const turno of turnos) {
      slots.push({
        sub: {
          id_area: combo.id_area,
          id_sub_area: combo.id_sub_area,
          sub_area_nombre: combo.sub_area_nombre,
          area_nombre: combo.area_nombre,
        },
        tipo: {
          id_tipo_auditoria: combo.id_tipo_auditoria,
          nombre: combo.tipo_nombre,
          id_nivel_usuario: combo.id_nivel_usuario,
        },
        turno,
        id_nivel_usuario: String(combo.id_nivel_usuario),
      });
    }
  }

  const fechaVencimiento = fechaVencimientoPeriodo(periodo);
  const yaConAuditoria = await empIdsConAuditoriaEnPeriodo(periodo);
  const usuariosPendientes = empleadosList.filter(
    (u) => !yaConAuditoria.has(String(u.emp_id).trim()),
  );

  let creadas = 0;
  let omitidas = empleadosList.length - usuariosPendientes.length;
  let sinSlot = 0;
  let compartidas = 0;
  const nuevasPorUsuario = new Map();

  const assignments = asignarUnaAuditoriaPorUsuario(
    usuariosPendientes,
    slots,
    areaNivelById,
  );
  sinSlot = usuariosPendientes.length - assignments.length;
  const reparto = resumenRepartoSlots(assignments);
  compartidas = reparto.slots_compartidos;

  for (const { slot, user } of assignments) {
    const empNombre = user.emp_nombre || user.emp_alias || String(user.emp_id);
    const empId = String(user.emp_id).trim();

    try {
      const [result] = await capDb.query(
        `INSERT INTO auditorias
         (id_area, id_sub_area, id_tipo_auditoria, emp_id, emp_nombre, periodo_mes, turno, fecha_programada)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          slot.sub.id_area,
          slot.sub.id_sub_area,
          slot.tipo.id_tipo_auditoria,
          empId,
          empNombre,
          periodo,
          slot.turno,
          fechaVencimiento,
        ],
      );
      if (result.affectedRows) {
        creadas += 1;
        if (!nuevasPorUsuario.has(empId)) {
          nuevasPorUsuario.set(empId, {
            emp_id: empId,
            nombre: empNombre,
            auditorias: [],
          });
        }
        nuevasPorUsuario.get(empId).auditorias.push({
          area_nombre: slot.sub.area_nombre,
          sub_area_nombre: slot.sub.sub_area_nombre,
          turno: slot.turno,
        });
      }
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") omitidas += 1;
      else throw err;
    }
  }

  if (creadas === 0 && omitidas === 0) {
    return {
      ok: false,
      status: 400,
      error: `No se generó ninguna auditoría. Usuarios pendientes: ${usuariosPendientes.length}, slots: ${slots.length}, sin slot compatible: ${sinSlot}. Revise preguntas, turnos, tipos/usuarios y niveles por área.`,
      data: {
        periodo_mes: periodo,
        creadas,
        omitidas,
        sin_slot: sinSlot,
        total_slots: slots.length,
        usuarios_pendientes: usuariosPendientes.length,
      },
    };
  }

  const combosSinAuditor = combos.length - combosConAuditor.length;
  const asignacionesCorreo = [...nuevasPorUsuario.values()];

  let correos = { correos_enviados: 0, correos_omitidos: 0, errores: [] };
  if (asignacionesCorreo.length > 0 && enviarCorreos) {
    if (!getSmtpConfig().configured) {
      correos = {
        correos_enviados: 0,
        correos_omitidos: asignacionesCorreo.length,
        errores: [
          "SMTP no configurado. Reinicie npm run dev después de guardar .env.local (EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD).",
        ],
      };
    } else {
      try {
        correos = await notificarUsuariosAuditoriasAsignadas({
          periodo,
          fechaProgramada: fechaVencimiento,
          asignaciones: asignacionesCorreo,
        });
      } catch (err) {
        correos.errores = [err.message || "Error al enviar correos de asignación"];
      }
    }
  }

  await registrarGeneracionPeriodo(periodo, { creadas, omitidas, automatica });

  const turnosUsados = [...new Set(slots.map((s) => s.turno))].sort();
  const data = {
    periodo_mes: periodo,
    creadas,
    omitidas,
    sin_slot: sinSlot,
    usuarios_asignados: creadas,
    compartidas,
    reparto_slots: reparto,
    total_combos: combosConAuditor.length,
    total_combos_sin_auditor: combosSinAuditor,
    total_slots: slots.length,
    turnos: turnosUsados,
    correos_enviados: correos.correos_enviados,
    correos_omitidos: correos.correos_omitidos,
    errores_correo: correos.errores,
    asignaciones_correo: asignacionesCorreo,
    fecha_programada: fechaVencimiento,
    ya_generado: true,
  };

  const message = `Se generaron ${creadas} auditorías (1 por usuario) para ${periodo}${
    turnosUsados.length ? ` · turnos ${turnosUsados.join(", ")}` : ""
  }${omitidas ? ` · ${omitidas} usuario(s) ya tenían auditoría en el mes` : ""}${
    sinSlot ? ` · ${sinSlot} sin slot compatible (nivel/área)` : ""
  }${
    reparto.slots_con_auditor
      ? ` · reparto por slot: mín ${reparto.min_por_slot}, máx ${reparto.max_por_slot} (ideal: diferencia ≤ 1)`
      : ""
  }${
    correos.correos_enviados ? ` · ${correos.correos_enviados} correo(s) enviado(s)` : ""
  }`;

  return { ok: true, status: 200, data, message };
  } catch (error) {
    await liberarGeneracionPeriodo(periodo);
    throw error;
  }
}
