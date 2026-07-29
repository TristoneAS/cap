const PREGUNTAS_POR_PAGINA = 19;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugNombre(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function chunkPreguntas(preguntas, size) {
  const chunks = [];
  for (let i = 0; i < preguntas.length; i += size) {
    chunks.push(preguntas.slice(i, i + size));
  }
  return chunks;
}

function buildEncabezado(auditoria) {
  return `
  <div style="margin-bottom:6px;line-height:1.25;font-size:8pt;">
    <div style="font-weight:700;font-size:10pt;margin-bottom:2px;">CAP · Hoja de auditoría LPA</div>
    <div>
      <strong>${escapeHtml(auditoria.area_nombre)}</strong> · ${escapeHtml(auditoria.sub_area_nombre)}
      · Turno ${escapeHtml(auditoria.turno)} · ${escapeHtml(auditoria.tipo_nombre)}
      · ${escapeHtml(auditoria.periodo_mes)} · Vence ${escapeHtml(auditoria.fecha_programada)}
    </div>
    <div>Auditor: ${escapeHtml(auditoria.emp_nombre)} (${escapeHtml(auditoria.emp_id)})</div>
  </div>`;
}

function buildTablaPreguntas(preguntas, offset = 0) {
  const filas = preguntas
    .map(
      (p, idx) => `
      <tr style="height:11.2mm;">
        <td style="width:18px;text-align:center;font-weight:700;border:1px solid #000;padding:1px 2px;font-size:8pt;vertical-align:middle;">${offset + idx + 1}</td>
        <td style="border:1px solid #000;padding:1px 4px;font-size:8pt;line-height:1.15;vertical-align:middle;">${escapeHtml(p.texto)}</td>
        <td style="width:28px;text-align:center;border:1px solid #000;padding:1px;font-size:7.5pt;vertical-align:middle;">&#9744;</td>
        <td style="width:28px;text-align:center;border:1px solid #000;padding:1px;font-size:7.5pt;vertical-align:middle;">&#9744;</td>
      </tr>`,
    )
    .join("");

  return `
  <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
    <thead>
      <tr>
        <th style="width:18px;border:1px solid #000;padding:2px;font-size:7.5pt;background:#eee;">#</th>
        <th style="border:1px solid #000;padding:2px 4px;font-size:7.5pt;background:#eee;text-align:left;">Pregunta</th>
        <th style="width:28px;border:1px solid #000;padding:2px;font-size:7.5pt;background:#eee;">Sí</th>
        <th style="width:28px;border:1px solid #000;padding:2px;font-size:7.5pt;background:#eee;">No</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>`;
}

function buildPagina(auditoria, preguntas, offset, esPrimera) {
  const salto = esPrimera ? "" : ' style="page-break-before:always;"';
  return `
  <div class="pagina"${salto}>
    ${buildEncabezado(auditoria)}
    ${buildTablaPreguntas(preguntas, offset)}
  </div>`;
}

export function buildHojaAuditoriaHtml({ auditoria, preguntas }) {
  const lista = preguntas || [];
  const paginas = chunkPreguntas(lista, PREGUNTAS_POR_PAGINA);

  const cuerpo = paginas
    .map((bloque, idx) => buildPagina(auditoria, bloque, idx * PREGUNTAS_POR_PAGINA, idx === 0))
    .join("");

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="es">
<head>
  <meta charset="utf-8" />
  <title>Auditoría LPA · ${escapeHtml(auditoria.area_nombre)}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
  <style>
    @page Section1 {
      size: 21.59cm 27.94cm;
      margin: 0.8cm 1cm 0.8cm 1cm;
      mso-page-orientation: portrait;
    }
    div.pagina { page: Section1; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 0; }
  </style>
</head>
<body>${cuerpo}</body>
</html>`;
}

export function descargarHojaAuditoriaWord({ auditoria, preguntas }) {
  if (!auditoria || !preguntas?.length) return false;

  const html = buildHojaAuditoriaHtml({ auditoria, preguntas });
  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  const nombreArchivo = [
    "auditoria",
    slugNombre(auditoria.area_nombre),
    slugNombre(auditoria.sub_area_nombre),
    `turno_${slugNombre(auditoria.turno)}`,
    slugNombre(auditoria.periodo_mes),
  ]
    .filter(Boolean)
    .join("_");

  enlace.href = url;
  enlace.download = `${nombreArchivo}.doc`;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
  return true;
}
