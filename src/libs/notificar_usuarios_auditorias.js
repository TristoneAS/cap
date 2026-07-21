import { empleados } from "@/libs/empleados";
import { isValidEmail, sendMailMessageWithRetry, createMailTransporter, sleep, getEmailDelayMs } from "@/libs/mailer";
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
 * Un correo por usuario con todas las auditorías recién asignadas en la generación.
 * @param {{ periodo: string, fechaProgramada: string, asignaciones: array }} params
 */
export async function notificarUsuariosAuditoriasAsignadas({
  periodo,
  fechaProgramada,
  asignaciones,
}) {
  if (!asignaciones?.length) {
    return { correos_enviados: 0, correos_omitidos: 0, errores: [] };
  }

  let correos_enviados = 0;
  let correos_omitidos = 0;
  const errores = [];
  const transporter = createMailTransporter();
  const delayMs = getEmailDelayMs();
  let enviadosEnLote = 0;

  for (const item of asignaciones) {
    const empId = String(item.emp_id ?? "").trim();
    const auditorias = item.auditorias || [];
    if (!empId || !auditorias.length) continue;

    const emp = await buscarEmpleado(empId);
    const correo = String(emp?.emp_correo ?? "").trim();
    const nombre =
      nombreCompletoEmpleado(emp) ||
      item.nombre ||
      emp?.emp_nombre ||
      empId;

    if (!isValidEmail(correo)) {
      correos_omitidos += 1;
      errores.push(`${empId} (${nombre}): sin correo válido registrado`);
      continue;
    }

    try {
      if (enviadosEnLote > 0 && delayMs > 0) {
        await sleep(delayMs);
      }
      await notificarUsuarioAuditoriasAsignadas({
        to: correo,
        nombre,
        periodo,
        fechaProgramada,
        auditorias,
        transporter,
      });
      correos_enviados += 1;
      enviadosEnLote += 1;
    } catch (err) {
      correos_omitidos += 1;
      errores.push(
        `${empId} (${nombre}): ${err.message || "Error al enviar correo"}`,
      );
    }
  }

  return { correos_enviados, correos_omitidos, errores };
}
