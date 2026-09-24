/** Filas de checklist por hoja (LPA + Poka comparten paginación). */
const FILAS_POR_PAGINA = 22;

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

function cumplePregunta(p) {
  const c = p.cumple ?? p.respuesta?.cumple ?? "";
  return c === "si" || c === "no" ? c : "";
}

function celdaCumple(cumple, valor) {
  return cumple === valor ? "&#9745;" : "&#9744;";
}

function tituloSeccion(texto) {
  return `<div style="font-weight:700;font-size:9pt;margin:8px 0 3px;color:#00695C;">${escapeHtml(texto)}</div>`;
}

function buildTablaPreguntas(preguntas, offset = 0) {
  const filas = preguntas
    .map((p, idx) => {
      const cumple = cumplePregunta(p);
      return `
      <tr style="height:10mm;">
        <td style="width:18px;text-align:center;font-weight:700;border:1px solid #000;padding:1px 2px;font-size:8pt;vertical-align:middle;">${offset + idx + 1}</td>
        <td style="border:1px solid #000;padding:1px 4px;font-size:8pt;line-height:1.15;vertical-align:middle;">${escapeHtml(p.texto)}</td>
        <td style="width:28px;text-align:center;border:1px solid #000;padding:1px;font-size:7.5pt;vertical-align:middle;">${celdaCumple(cumple, "si")}</td>
        <td style="width:28px;text-align:center;border:1px solid #000;padding:1px;font-size:7.5pt;vertical-align:middle;">${celdaCumple(cumple, "no")}</td>
      </tr>`;
    })
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

function buildBloquePokaExenta(preguntaExenta, exenta) {
  const ex = exenta === "si" || exenta === "no" ? exenta : "";
  return `
    ${tituloSeccion("Poka Yoke")}
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:4px;">
      <tr>
        <td style="border:1px solid #000;padding:4px 6px;font-size:8pt;line-height:1.2;">${escapeHtml(preguntaExenta)}</td>
        <td style="width:32px;text-align:center;border:1px solid #000;font-size:7.5pt;">Sí<br/>${celdaCumple(ex, "si")}</td>
        <td style="width:32px;text-align:center;border:1px solid #000;font-size:7.5pt;">No<br/>${celdaCumple(ex, "no")}</td>
      </tr>
    </table>
    ${
      ex === "si"
        ? `<p style="font-size:7.5pt;color:#444;margin:0 0 4px;">El checklist Poka Yoke no aplica (área exenta).</p>`
        : ""
    }`;
}

/**
 * Arma bloques de contenido y los reparte en hojas con un solo salto explícito entre hojas.
 */
function paginarContenido(auditoria, bloques) {
  const hojas = [];
  let actual = [];
  let filasEnHoja = 0;

  const cerrarHoja = () => {
    if (!actual.length) return;
    hojas.push(actual);
    actual = [];
    filasEnHoja = 0;
  };

  for (const bloque of bloques) {
    if (bloque.tipo === "html") {
      actual.push(bloque.html);
      continue;
    }
    if (bloque.tipo === "tabla") {
      const filas = bloque.preguntas || [];
      let offset = 0;
      let restantes = filas;
      while (restantes.length) {
        const espacio = FILAS_POR_PAGINA - filasEnHoja;
        if (espacio <= 0) {
          cerrarHoja();
          continue;
        }
        const tomar = restantes.slice(0, espacio);
        restantes = restantes.slice(espacio);
        if (bloque.titulo && filasEnHoja === 0 && offset === 0) {
          actual.push(tituloSeccion(bloque.titulo));
        } else if (bloque.titulo && offset > 0) {
          actual.push(tituloSeccion(`${bloque.titulo} (cont.)`));
        }
        actual.push(buildTablaPreguntas(tomar, bloque.offsetBase + offset));
        filasEnHoja += tomar.length;
        offset += tomar.length;
        if (restantes.length && filasEnHoja >= FILAS_POR_PAGINA) {
          cerrarHoja();
        }
      }
    }
  }
  cerrarHoja();
  return hojas.map((partes, idx) => {
    const salto = idx === 0 ? "" : ' style="page-break-before:always;"';
    return `<div${salto}>${buildEncabezado(auditoria)}${partes.join("")}</div>`;
  });
}

export function buildHojaAuditoriaHtml({ auditoria, preguntas, poka }) {
  const bloques = [];
  const lista = preguntas || [];

  if (lista.length) {
    bloques.push({
      tipo: "tabla",
      titulo: "Preguntas LPA",
      preguntas: lista,
      offsetBase: 0,
    });
  }

  if (poka?.preguntaExenta) {
    const exenta = poka.exenta === "si" || poka.exenta === "no" ? poka.exenta : "";
    bloques.push({
      tipo: "html",
      html: buildBloquePokaExenta(poka.preguntaExenta, exenta),
    });
    if (exenta !== "si") {
      const pokaLista = poka.preguntas || [];
      if (pokaLista.length) {
        bloques.push({
          tipo: "tabla",
          titulo: "Checklist Poka Yoke",
          preguntas: pokaLista,
          offsetBase: 0,
        });
      }
    }
  }

  const cuerpo =
    bloques.length > 0
      ? paginarContenido(auditoria, bloques).join("")
      : `<div>${buildEncabezado(auditoria)}</div>`;

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="es">
<head>
  <meta charset="utf-8" />
  <title>Auditoría LPA · ${escapeHtml(auditoria.area_nombre)}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
  <style>
    @page {
      size: 21.59cm 27.94cm;
      margin: 0.8cm 1cm 0.8cm 1cm;
    }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 0; }
  </style>
</head>
<body>${cuerpo}</body>
</html>`;
}

export function descargarHojaAuditoriaWord({ auditoria, preguntas, poka }) {
  if (!auditoria) return false;
  const tieneLpa = (preguntas || []).length > 0;
  const tienePoka = Boolean(poka?.preguntaExenta);
  if (!tieneLpa && !tienePoka) return false;

  const html = buildHojaAuditoriaHtml({ auditoria, preguntas, poka });
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
