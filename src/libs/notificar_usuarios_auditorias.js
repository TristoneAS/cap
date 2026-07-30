import { capDb } from "@/libs/cap_db";
import { empleados } from "@/libs/empleados";
import {
  isValidEmail,
  sendMailMessageWithRetry,
  createMailTransporter,
  warmMailTransporter,
  closeMailTransporter,
  sleep,
  getEmailDelayMs,
  getRateLimitBackoffMs,
  isRateLimitError,
} from "@/libs/mailer";
import { mapEmpleadoRow, nombreCompletoEmpleado } from "@/libs/empleado_mapper";
import { ENLACE_CAP_CORREO } from "@/libs/notificar_jefes_auditorias";

const BRAND = "#e67e22";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtmlCorreoUsuario({ nombre, periodo, fechaProgramada, auditorias, enlace }) {
  const filas = auditorias
    .map(
      (aud) => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;">${escapeHtml(aud.area_nombre)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;">${escapeHtml(aud.sub_area_nombre)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;">Turno ${escapeHtml(aud.turno)}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px;">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:6px;overflow:hidden;border:1px solid #e0e0e0;">
    <tr><td style="background:${BRAND};color:#fff;padding:14px 18px;font-size:16px;font-weight:700;">CAP · Auditorías LPA</td></tr>
    <tr><td style="padding:18px;color:#333;font-size:13px;line-height:1.5;">
      <p>Hola <strong>${escapeHtml(nombre)}</strong>,</p>
      <p>Se le asignaron <strong>${auditorias.length}</strong> auditoría(s) para el periodo
      <strong>${escapeHtml(periodo)}</strong>. Fecha programada: <strong>${escapeHtml(fechaProgramada)}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">
        <thead>
          <tr style="background:#fafafa;">
            <th align="left" style="padding:6px 8px;font-size:10px;color:#666;">Área</th>
            <th align="left" style="padding:6px 8px;font-size:10px;color:#666;">Sub área</th>
            <th align="left" style="padding:6px 8px;font-size:10px;color:#666;">Turno</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <p style="margin-top:16px;">Consulte sus auditorías en:</p>
      <p><a href="${escapeHtml(enlace)}/dashboard/auditorias" style="color:${BRAND};font-weight:700;">${escapeHtml(enlace)}/dashboard/auditorias</a></p>
      <p style="font-size:10px;color:#888;margin-top:20px;">Mensaje automático. No responda a este correo.</p>
    </td></tr>
  </table></td></tr></table></body></html>`;
}

function buildTextoCorreoUsuario({ nombre, periodo, fechaProgramada, auditorias, enlace }) {
  const lineas = [
    `Hola ${nombre},`,
    "",
    `Se le asignaron ${auditorias.length} auditoría(s) para el periodo ${periodo}.`,
    `Fecha programada: ${fechaProgramada}.`,
    "",
    "Asignaciones:",
  ];

  for (const aud of auditorias) {
    lineas.push(
      `  - ${aud.area_nombre} · ${aud.sub_area_nombre} · Turno ${aud.turno}`,
    );
  }

  lineas.push("", `Mis auditorías: ${enlace}/dashboard/auditorias`);
  lineas.push("", "Mensaje automático. No responda a este correo.");
  return lineas.join("\n");
}

export async function listarAsignacionesCorreoPeriodo(periodo_mes) {
  const periodo = String(periodo_mes ?? "").trim();
  const [rows] = await capDb.query(
    `SELECT aud.emp_id, aud.emp_nombre, aud.turno,
            a.nombre AS area_nombre, sa.nombre AS sub_area_nombre
     FROM auditorias aud
     INNER JOIN areas a ON a.id_area = aud.id_area
     INNER JOIN sub_areas sa ON sa.id_sub_area = aud.id_sub_area
     WHERE aud.periodo_mes = ?
     ORDER BY aud.emp_nombre ASC, a.nombre ASC, sa.nombre ASC, aud.turno ASC`,
    [periodo],
  );

  const porUsuario = new Map();
  for (const row of rows) {
    const empId = String(row.emp_id);
    if (!porUsuario.has(empId)) {
      porUsuario.set(empId, {
        emp_id: empId,
        nombre: row.emp_nombre,
        auditorias: [],
      });
    }
    porUsuario.get(empId).auditorias.push({
      area_nombre: row.area_nombre,
      sub_area_nombre: row.sub_area_nombre,
      turno: row.turno,
    });
  }

  return [...porUsuario.values()];
}

async function buscarEmpleadosPorIds(empIds) {
  const ids = [...new Set(empIds.map((id) => String(id).trim()).filter(Boolean))];
  if (!ids.length) return new Map();
  try {
    const placeholders = ids.map(() => "?").join(", ");
    const [rows] = await empleados.query(
      `SELECT * FROM del_empleados WHERE CAST(emp_id AS CHAR) IN (${placeholders})`,
      ids,
    );
    const map = new Map();
    for (const row of rows) {
      const emp = mapEmpleadoRow(row);
      map.set(String(emp.emp_id), emp);
    }
    return map;
  } catch {
    return new Map();
  }
}

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

/**
 * @param {{ to: string, nombre: string, periodo: string, fechaProgramada: string, auditorias: array }} params
 */
export async function notificarUsuarioAuditoriasAsignadas({
  to,
  nombre,
  periodo,
  fechaProgramada,
  auditorias,
  transporter,
}) {
  const enlace = ENLACE_CAP_CORREO;
  const subject = `CAP · Auditorías asignadas — periodo ${periodo}`;
  const text = buildTextoCorreoUsuario({
    nombre,
    periodo,
    fechaProgramada,
    auditorias,
    enlace,
  });
  const html = buildHtmlCorreoUsuario({
    nombre,
    periodo,
    fechaProgramada,
    auditorias,
    enlace,
  });

  await sendMailMessageWithRetry({ to, subject, text, html }, transporter);
  return { enviado: true, correo: to };
}

/**
 * Envía el correo de asignación a un solo usuario.
 */
export async function notificarAsignacionUsuario({
  periodo,
  fechaProgramada,
  asignacion,
  transporter,
  empleadoCache,
}) {
  const empId = String(asignacion?.emp_id ?? "").trim();
  const auditorias = asignacion?.auditorias || [];
  if (!empId || !auditorias.length) {
    return { enviado: false, error: "Asignación inválida" };
  }

  const emp =
    empleadoCache?.get(empId) ?? (await buscarEmpleado(empId));
  const correo = String(emp?.emp_correo ?? "").trim();
  const nombre =
    nombreCompletoEmpleado(emp) ||
    asignacion.nombre ||
    emp?.emp_nombre ||
    empId;

  if (!isValidEmail(correo)) {
    return {
      enviado: false,
      error: `${empId} (${nombre}): sin correo válido registrado`,
    };
  }

  const mailer = transporter || createMailTransporter();
  await notificarUsuarioAuditoriasAsignadas({
    to: correo,
    nombre,
    periodo,
    fechaProgramada,
    auditorias,
    transporter: mailer,
  });

  return { enviado: true, correo, emp_id: empId, nombre };
}

/**
 * Envía correos uno a uno y emite progreso (para streaming al cliente).
 */
export async function* iterarEnvioCorreosAsignacion({
  periodo,
  fechaProgramada,
  asignaciones,
}) {
  const lista = (asignaciones || []).filter(
    (a) => String(a?.emp_id ?? "").trim() && (a?.auditorias || []).length,
  );
  const total = lista.length;

  if (!total) {
    yield {
      enviados: 0,
      omitidos: 0,
      procesados: 0,
      total: 0,
      terminado: true,
      errores: [],
    };
    return;
  }

  const empleadosMap = await buscarEmpleadosPorIds(lista.map((a) => a.emp_id));
  const transporter = createMailTransporter({ pooled: true });
  const delayMs = getEmailDelayMs();
  let enviados = 0;
  let omitidos = 0;
  const errores = [];

  try {
    await warmMailTransporter(transporter);

    for (let i = 0; i < lista.length; i += 1) {
      const item = lista[i];
      const empId = String(item.emp_id);

      try {
        if (i > 0 && delayMs > 0) {
          await sleep(delayMs);
        }
        const resultado = await notificarAsignacionUsuario({
          periodo,
          fechaProgramada,
          asignacion: item,
          transporter,
          empleadoCache: empleadosMap,
        });
        if (resultado.enviado) {
          enviados += 1;
        } else {
          omitidos += 1;
          if (resultado.error) errores.push(resultado.error);
        }
      } catch (err) {
        omitidos += 1;
        errores.push(`${empId}: ${err.message || "Error al enviar correo"}`);
        if (isRateLimitError(err)) {
          await sleep(getRateLimitBackoffMs());
        }
      }

      yield {
        enviados,
        omitidos,
        procesados: i + 1,
        total,
        terminado: i === lista.length - 1,
        errores: [...errores],
      };
    }
  } finally {
    closeMailTransporter(transporter);
  }
}

/**
 * Un correo por usuario con todas las auditorías recién asignadas en la generación.
 * @param {{ periodo: string, fechaProgramada: string, asignaciones: array }} params
 */
export async function notificarUsuariosAuditoriasAsignadas({
  periodo,
  fechaProgramada,
  asignaciones,
}) {
  let resultado = { correos_enviados: 0, correos_omitidos: 0, errores: [] };
  for await (const evt of iterarEnvioCorreosAsignacion({
    periodo,
    fechaProgramada,
    asignaciones,
  })) {
    resultado = {
      correos_enviados: evt.enviados,
      correos_omitidos: evt.omitidos,
      errores: evt.errores,
    };
  }
  return resultado;
}
