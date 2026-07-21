import { isValidEmail, sendMailMessageWithRetry } from "@/libs/mailer";
import { nombreCompletoEmpleado } from "@/libs/empleado_mapper";

const BRAND = "#e67e22";

export const ENLACE_CAP_CORREO = (() => {
  const env =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.ENLACE_SISTEMA_CORREO;
  return String(env || "http://localhost:3000").replace(/\/$/, "");
})();

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtmlCorreoJefe({ nombreJefe, periodo, equipo, enlace }) {
  const filas = equipo
    .flatMap((persona) =>
      persona.auditorias_pendientes.map(
        (aud) => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;">${escapeHtml(persona.nombre)} (${escapeHtml(persona.emp_id)})</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;">${escapeHtml(aud.area_nombre)} · ${escapeHtml(aud.sub_area_nombre)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;">Turno ${escapeHtml(aud.turno)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;">${escapeHtml(aud.tipo_nombre)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;">${escapeHtml(aud.fecha_programada)}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:11px;">${escapeHtml(aud.estado)}</td>
        </tr>`,
      ),
    )
    .join("");

  const totalAud = equipo.reduce((s, p) => s + p.total_pendientes, 0);

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Segoe UI,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:16px;">
  <table width="640" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:6px;overflow:hidden;border:1px solid #e0e0e0;">
    <tr><td style="background:${BRAND};color:#fff;padding:14px 18px;font-size:16px;font-weight:700;">CAP · Auditorías LPA</td></tr>
    <tr><td style="padding:18px;color:#333;font-size:13px;line-height:1.5;">
      <p>Hola <strong>${escapeHtml(nombreJefe)}</strong>,</p>
      <p>Llegó la fecha programada de auditorías del periodo <strong>${escapeHtml(periodo)}</strong>.
      A continuación, el resumen de personas a su cargo que aún tienen auditorías pendientes
      (<strong>${equipo.length}</strong> persona(s), <strong>${totalAud}</strong> auditoría(s)):</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-top:12px;">
        <thead>
          <tr style="background:#fafafa;">
            <th align="left" style="padding:6px 8px;font-size:10px;color:#666;">Auditor</th>
            <th align="left" style="padding:6px 8px;font-size:10px;color:#666;">Área / Sub área</th>
            <th align="left" style="padding:6px 8px;font-size:10px;color:#666;">Turno</th>
            <th align="left" style="padding:6px 8px;font-size:10px;color:#666;">Tipo</th>
            <th align="left" style="padding:6px 8px;font-size:10px;color:#666;">Fecha programada</th>
            <th align="left" style="padding:6px 8px;font-size:10px;color:#666;">Estado</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
      <p style="margin-top:16px;">Revise el detalle en el sistema:</p>
      <p><a href="${escapeHtml(enlace)}/dashboard/auditorias/equipo" style="color:${BRAND};font-weight:700;">${escapeHtml(enlace)}/dashboard/auditorias/equipo</a></p>
      <p style="font-size:10px;color:#888;margin-top:20px;">Mensaje automático. No responda a este correo.</p>
    </td></tr>
  </table></td></tr></table></body></html>`;
}

function buildTextoCorreoJefe({ nombreJefe, periodo, equipo, enlace }) {
  const lineas = [
    `Hola ${nombreJefe},`,
    "",
    `Llegó la fecha programada de auditorías del periodo ${periodo}.`,
    "Personas a su cargo con auditorías aún pendientes:",
    "",
  ];

  for (const persona of equipo) {
    lineas.push(`${persona.nombre} (${persona.emp_id}):`);
    for (const aud of persona.auditorias_pendientes) {
      lineas.push(
        `  - ${aud.area_nombre} · ${aud.sub_area_nombre} · Turno ${aud.turno} · ${aud.tipo_nombre} · Fecha ${aud.fecha_programada} · ${aud.estado}`,
      );
    }
    lineas.push("");
  }

  lineas.push(`Equipo: ${enlace}/dashboard/auditorias/equipo`);
  lineas.push("", "Mensaje automático. No responda a este correo.");
  return lineas.join("\n");
}

/**
 * Un solo correo por jefe con la lista completa de su equipo.
 * @param {{ jefe: object, periodo: string, equipo: array }} params
 */
export async function notificarJefeAuditoriasPendientes({ jefe, periodo, equipo }) {
  const correo = String(jefe?.emp_correo ?? "").trim();
  const nombreJefe =
    nombreCompletoEmpleado(jefe) || jefe?.emp_nombre || String(jefe?.emp_id);

  if (!isValidEmail(correo)) {
    return {
      enviado: false,
      motivo: `Jefe ${jefe?.emp_id}: sin correo válido registrado`,
    };
  }

  const enlace = ENLACE_CAP_CORREO;
  const subject = `CAP · Auditorías pendientes — periodo ${periodo}`;
  const text = buildTextoCorreoJefe({ nombreJefe, periodo, equipo, enlace });
  const html = buildHtmlCorreoJefe({ nombreJefe, periodo, equipo, enlace });

  await sendMailMessageWithRetry({ to: correo, subject, text, html });

  return { enviado: true, correo };
}

/** @deprecated usar notificarJefeAuditoriasPendientes */
export const notificarJefeAuditoriasVencidas = notificarJefeAuditoriasPendientes;
