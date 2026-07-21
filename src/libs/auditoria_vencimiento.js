import { capDb } from "@/libs/cap_db";
import { empleados } from "@/libs/empleados";
import { hoyPlantaYYYYMMDD } from "@/libs/auditoria_fechas";
import { nombreCompletoEmpleado, mapEmpleadoRow } from "@/libs/empleado_mapper";
import { notificarJefeAuditoriasPendientes } from "@/libs/notificar_jefes_auditorias";

const ESTADOS_ABIERTOS = ["pendiente", "en_progreso", "vencida"];

async function buscarEmpleado(empId) {
  const id = String(empId ?? "").trim();
  if (!id) return null;
  try {
    const [rows] = await empleados.query(
      `SELECT * FROM del_empleados WHERE CAST(emp_id AS CHAR) = ? LIMIT 1`,
      [id],
    );
    return rows[0] ? mapEmpleadoRow(rows[0]) : null;
  } catch {
    return null;
  }
}

async function subordinadosDeJefe(empIdJefe) {
  try {
    const [rows] = await empleados.query(
      `SELECT * FROM del_empleados
       WHERE CAST(emp_id_jefe AS CHAR) = ?
         AND (emp_activo = 1 OR emp_activo IS NULL)`,
      [empIdJefe],
    );
    return rows || [];
  } catch {
    const [rows] = await empleados.query(
      `SELECT * FROM del_empleados WHERE CAST(emp_id_jefe AS CHAR) = ?`,
      [empIdJefe],
    );
    return rows || [];
  }
}

async function armarEquipoPendientesJefe(empIdJefe, periodo) {
  const subordinadosRows = await subordinadosDeJefe(empIdJefe);
  const subIds = subordinadosRows.map((s) => String(s.emp_id));
  if (!subIds.length) return [];

  const placeholders = subIds.map(() => "?").join(", ");
  const [auditorias] = await capDb.query(
    `SELECT aud.id_auditoria, aud.emp_id, aud.emp_nombre, aud.periodo_mes,
            aud.turno, aud.estado, aud.fecha_programada,
            a.nombre AS area_nombre, sa.nombre AS sub_area_nombre,
            t.nombre AS tipo_nombre
     FROM auditorias aud
     INNER JOIN areas a ON a.id_area = aud.id_area
     INNER JOIN sub_areas sa ON sa.id_sub_area = aud.id_sub_area
     INNER JOIN tipos_auditoria t ON t.id_tipo_auditoria = aud.id_tipo_auditoria
     WHERE aud.periodo_mes = ?
       AND aud.estado IN (${ESTADOS_ABIERTOS.map(() => "?").join(", ")})
       AND CAST(aud.emp_id AS CHAR) IN (${placeholders})
     ORDER BY aud.emp_nombre ASC, a.nombre ASC, sa.nombre ASC, aud.turno ASC`,
    [periodo, ...ESTADOS_ABIERTOS, ...subIds],
  );

  if (!auditorias.length) return [];

  return subordinadosRows
    .map((row) => {
      const empId = String(row.emp_id);
      const pendientes = auditorias.filter((a) => String(a.emp_id) === empId);
      if (!pendientes.length) return null;
      return {
        emp_id: empId,
        nombre:
          nombreCompletoEmpleado(row) ||
          row.emp_nombre ||
          pendientes[0].emp_nombre,
        auditorias_pendientes: pendientes,
        total_pendientes: pendientes.length,
      };
    })
    .filter(Boolean);
}

/** Estado vencida: solo después de que pasó fecha_programada (día siguiente). */
async function marcarAuditoriasVencidas(hoy) {
  const [updateResult] = await capDb.query(
    `UPDATE auditorias
     SET estado = 'vencida'
     WHERE estado IN ('pendiente', 'en_progreso')
       AND fecha_programada < ?`,
    [hoy],
  );
  return Number(updateResult.affectedRows) || 0;
}

/**
 * Un solo correo por jefe y periodo cuando llega fecha_programada (<= hoy),
 * con la lista completa de subordinados que aún tienen auditorías abiertas.
 */
async function enviarCorreosJefes(hoy) {
  const [periodosRows] = await capDb.query(
    `SELECT DISTINCT periodo_mes
     FROM auditorias
     WHERE estado IN ('pendiente', 'en_progreso', 'vencida')
       AND fecha_programada <= ?`,
    [hoy],
  );

  if (!periodosRows.length) {
    return { correos_enviados: 0, correos_omitidos: 0, errores: [] };
  }

  let correos_enviados = 0;
  let correos_omitidos = 0;
  const errores = [];

  for (const { periodo_mes: periodo } of periodosRows) {
    const [empRows] = await capDb.query(
      `SELECT DISTINCT emp_id
       FROM auditorias
       WHERE periodo_mes = ?
         AND estado IN ('pendiente', 'en_progreso', 'vencida')`,
      [periodo],
    );

    const jefeIds = new Set();
    for (const row of empRows) {
      const emp = await buscarEmpleado(row.emp_id);
      const jefeId = String(emp?.emp_id_jefe ?? "").trim();
      if (jefeId) jefeIds.add(jefeId);
    }

    for (const empIdJefe of jefeIds) {
      const [yaEnviado] = await capDb.query(
        `SELECT id_alerta FROM auditorias_alerta_jefe
         WHERE emp_id_jefe = ? AND periodo_mes = ?`,
        [empIdJefe, periodo],
      );
      if (yaEnviado.length) {
        correos_omitidos += 1;
        continue;
      }

      const jefe = await buscarEmpleado(empIdJefe);
      if (!jefe) {
        errores.push(`Jefe ${empIdJefe}: no encontrado en del_empleados`);
        continue;
      }

      const equipo = await armarEquipoPendientesJefe(empIdJefe, periodo);
      if (!equipo.length) continue;

      try {
        const resultado = await notificarJefeAuditoriasPendientes({
          jefe,
          periodo,
          equipo,
        });

        if (resultado.enviado) {
          await capDb.query(
            `INSERT INTO auditorias_alerta_jefe
             (emp_id_jefe, periodo_mes, correo_destino, total_subordinados, total_auditorias)
             VALUES (?, ?, ?, ?, ?)`,
            [
              empIdJefe,
              periodo,
              resultado.correo,
              equipo.length,
              equipo.reduce((s, e) => s + e.total_pendientes, 0),
            ],
          );
          correos_enviados += 1;
        } else {
          correos_omitidos += 1;
          if (resultado.motivo) errores.push(resultado.motivo);
        }
      } catch (err) {
        errores.push(
          `Jefe ${empIdJefe} (${periodo}): ${err.message || "Error al enviar correo"}`,
        );
      }
    }
  }

  return { correos_enviados, correos_omitidos, errores };
}

/**
 * 1) Correo a jefes cuando llega fecha_programada (un correo con todo su equipo).
 * 2) Marca estado vencida solo cuando ya pasó esa fecha.
 */
export async function procesarVencimientosAuditorias() {
  const hoy = hoyPlantaYYYYMMDD();

  const correos = await enviarCorreosJefes(hoy);
  const marcadas = await marcarAuditoriasVencidas(hoy);

  return { marcadas, ...correos };
}
