import { capDb } from "@/libs/cap_db";
import { fechaVencimientoPeriodo, periodoMesPlanta } from "@/libs/auditoria_fechas";
import { notificarUsuariosAuditoriasAsignadas } from "@/libs/notificar_usuarios_auditorias";
import { getSmtpConfig } from "@/libs/mailer";

const TURNOS = ["A", "B"];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function distribuirAsignaciones(slots, usuarios) {
  if (!slots.length || !usuarios.length) return [];

  const shuffledSlots = shuffle(slots);
  const shuffledUsers = shuffle(usuarios);
  const assignments = [];

  if (shuffledSlots.length >= shuffledUsers.length) {
    // Más slots que usuarios: reparto round-robin (todos auditan al menos un área).
    for (let i = 0; i < shuffledSlots.length; i += 1) {
      assignments.push({
        slot: shuffledSlots[i],
        user: shuffledUsers[i % shuffledUsers.length],
      });
    }
  } else {
    // Más usuarios que slots: primero uno por slot, luego compartidas (todos auditan al menos una).
    for (let i = 0; i < shuffledSlots.length; i += 1) {
      assignments.push({
        slot: shuffledSlots[i],
        user: shuffledUsers[i],
      });
    }
    const sobrantes = shuffledUsers.slice(shuffledSlots.length);
    for (let i = 0; i < sobrantes.length; i += 1) {
      assignments.push({
        slot: shuffledSlots[i % shuffledSlots.length],
        user: sobrantes[i],
      });
    }
  }

  return assignments;
}

/** Clave única de slot: sub área + tipo + turno (sin auditor). */
function slotKey(slot) {
  return `${slot.sub.id_sub_area}|${slot.tipo.id_tipo_auditoria}|${slot.turno}`;
}

async function slotsExistentesPorPeriodo(periodo) {
  const [rows] = await capDb.query(
    `SELECT DISTINCT id_sub_area, id_tipo_auditoria, turno
     FROM auditorias WHERE periodo_mes = ?`,
    [periodo],
  );
  return new Set(
    rows.map((r) => `${r.id_sub_area}|${r.id_tipo_auditoria}|${r.turno}`),
  );
}

/** Slots con más de un auditor en el mismo lote (compartidas). */
function slotsCompartidosEnAsignaciones(assignments) {
  const counts = new Map();
  for (const { slot } of assignments) {
    const k = slotKey(slot);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return new Set(
    [...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k),
  );
}

async function resumenGeneracionPeriodo(periodo) {
  const [rows] = await capDb.query(
    `SELECT periodo_mes, fecha_generacion, creadas, omitidas, automatica
     FROM auditorias_generacion_mes WHERE periodo_mes = ?`,
    [periodo],
  );
  return rows[0] || null;
}

async function bloquearGeneracionPeriodo(periodo, { forzar = false } = {}) {
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

  try {
    await capDb.query(
      `INSERT INTO auditorias_generacion_mes (periodo_mes) VALUES (?)`,
      [periodo],
    );
    return { ok: true };
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      const dup = await resumenGeneracionPeriodo(periodo);
      return {
        ok: false,
        status: 409,
        error: `Ya se generaron las auditorías del periodo ${periodo}. Solo se permite una generación por mes.`,
        data: { periodo_mes: periodo, ya_generado: true, generacion: dup },
      };
    }
    throw err;
  }
}

async function finalizarGeneracionPeriodo(
  periodo,
  { creadas, omitidas, automatica = false },
) {
  await capDb.query(
    `UPDATE auditorias_generacion_mes
     SET creadas = ?, omitidas = ?, automatica = ?
     WHERE periodo_mes = ?`,
    [creadas, omitidas, automatica ? 1 : 0, periodo],
  );
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
  const { forzar = false, automatica = false } = opts;
  const periodo = String(periodo_mes ?? periodoMesPlanta()).trim();
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    return {
      ok: false,
      status: 400,
      error: "periodo_mes inválido (YYYY-MM)",
    };
  }

  const bloqueo = await bloquearGeneracionPeriodo(periodo, { forzar });
  if (!bloqueo.ok) {
    return bloqueo;
  }

  const [combos] = await capDb.query(
    `SELECT DISTINCT
        p.id_area,
        p.id_sub_area,
        p.id_tipo_auditoria,
        a.nombre AS area_nombre,
        sa.nombre AS sub_area_nombre,
        t.nombre AS tipo_nombre,
        t.id_nivel_usuario
     FROM preguntas p
     INNER JOIN areas a
       ON a.id_area = p.id_area AND a.estado = 'activo'
     INNER JOIN sub_areas sa
       ON sa.id_sub_area = p.id_sub_area AND sa.estado = 'activo'
     INNER JOIN tipos_auditoria t
       ON t.id_tipo_auditoria = p.id_tipo_auditoria AND t.estado = 'activo'
     INNER JOIN niveles_usuario nu
       ON nu.id_nivel_usuario = t.id_nivel_usuario AND nu.estado = 'activo'
     WHERE p.estado = 'activo'`,
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

  const shuffledCombos = shuffle(combosConAuditor);
  const slots = [];
  for (const combo of shuffledCombos) {
    for (const turno of TURNOS) {
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

  const slotsPorNivel = slots.reduce((acc, slot) => {
    const key = String(slot.id_nivel_usuario);
    if (!acc[key]) acc[key] = [];
    acc[key].push(slot);
    return acc;
  }, {});

  const fechaVencimiento = fechaVencimientoPeriodo(periodo);
  const slotsOcupados = await slotsExistentesPorPeriodo(periodo);
  let creadas = 0;
  let omitidas = 0;
  let sinAuditor = 0;
  let compartidas = 0;
  const nuevasPorUsuario = new Map();

  for (const idNivel of Object.keys(slotsPorNivel)) {
    const nivelSlots = slotsPorNivel[idNivel];
    const nivelUsers = usuariosPorNivel[idNivel] || [];

    if (!nivelUsers.length) {
      sinAuditor += nivelSlots.length;
      continue;
    }

    const slotsPendientes = nivelSlots.filter((s) => !slotsOcupados.has(slotKey(s)));
    omitidas += nivelSlots.length - slotsPendientes.length;

    if (!slotsPendientes.length) {
      continue;
    }

    const assignments = distribuirAsignaciones(slotsPendientes, nivelUsers);
    const compartidasEnLote = slotsCompartidosEnAsignaciones(assignments);

    if (nivelUsers.length > slotsPendientes.length) {
      compartidas += nivelUsers.length - slotsPendientes.length;
    }

    for (const { slot, user } of assignments) {
      const sk = slotKey(slot);
      if (slotsOcupados.has(sk) && !compartidasEnLote.has(sk)) {
        omitidas += 1;
        continue;
      }

      const empNombre = user.emp_nombre || user.emp_alias || String(user.emp_id);

      try {
        const [result] = await capDb.query(
          `INSERT INTO auditorias
           (id_area, id_sub_area, id_tipo_auditoria, emp_id, emp_nombre, periodo_mes, turno, fecha_programada)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            slot.sub.id_area,
            slot.sub.id_sub_area,
            slot.tipo.id_tipo_auditoria,
            String(user.emp_id),
            empNombre,
            periodo,
            slot.turno,
            fechaVencimiento,
          ],
        );
        if (result.affectedRows) {
          creadas += 1;
          slotsOcupados.add(sk);
          const empId = String(user.emp_id);
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
  }

  if (creadas === 0 && omitidas === 0) {
    await capDb.query(`DELETE FROM auditorias_generacion_mes WHERE periodo_mes = ?`, [
      periodo,
    ]);
    return {
      ok: false,
      status: 400,
      error: `No se generó ninguna auditoría. Slots: ${slots.length}, sin auditor de nivel: ${sinAuditor}. Revise preguntas, tipos/usuarios y sus niveles.`,
      data: {
        periodo_mes: periodo,
        creadas,
        omitidas,
        sin_auditor_nivel: sinAuditor,
        total_slots: slots.length,
      },
    };
  }

  const combosSinAuditor = combos.length - combosConAuditor.length;

  let correos = { correos_enviados: 0, correos_omitidos: 0, errores: [] };
  if (nuevasPorUsuario.size > 0) {
    if (!getSmtpConfig().configured) {
      correos = {
        correos_enviados: 0,
        correos_omitidos: nuevasPorUsuario.size,
        errores: [
          "SMTP no configurado. Reinicie npm run dev después de guardar .env.local (EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD).",
        ],
      };
    } else {
      try {
        correos = await notificarUsuariosAuditoriasAsignadas({
          periodo,
          fechaProgramada: fechaVencimiento,
          asignaciones: [...nuevasPorUsuario.values()],
        });
      } catch (err) {
        correos.errores = [err.message || "Error al enviar correos de asignación"];
      }
    }
  }

  await finalizarGeneracionPeriodo(periodo, { creadas, omitidas, automatica });

  const data = {
    periodo_mes: periodo,
    creadas,
    omitidas,
    sin_auditor_nivel: sinAuditor,
    compartidas,
    total_combos: combosConAuditor.length,
    total_combos_sin_auditor: combosSinAuditor,
    total_slots: slots.length,
    turnos: TURNOS,
    correos_enviados: correos.correos_enviados,
    correos_omitidos: correos.correos_omitidos,
    errores_correo: correos.errores,
    ya_generado: true,
  };

  const message = `Se generaron ${creadas} auditorías (turnos A y B) para ${periodo}${
    omitidas ? `, ${omitidas} omitidas (ya existían)` : ""
  }${compartidas ? ` (${compartidas} compartidas por sobrar usuarios)` : ""}${
    sinAuditor ? ` (${sinAuditor} sin auditor del nivel requerido)` : ""
  }${correos.correos_enviados ? `. ${correos.correos_enviados} correo(s) enviado(s)` : ""}`;

  return { ok: true, status: 200, data, message };
}
