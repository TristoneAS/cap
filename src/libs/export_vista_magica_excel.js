const COLS_PER_ROW = 4;
const COL_STEP = 7;
const ROW_STEP = 16;
const IMG_WIDTH = 280;
const IMG_HEIGHT = 230;
const HEADER_ROWS = 3;

function slugPeriodo(periodoSlug, periodoLabel) {
  return String(periodoSlug || periodoLabel || "periodo")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}

function dataUrlToBuffer(dataUrl) {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function downloadBuffer(buffer, filename) {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

/**
 * Exporta las tarjetas de la vista mágica como imágenes en un .xlsx (una hoja).
 * @param {{ periodoLabel: string, periodoSlug?: string, containerEl: HTMLElement }} params
 */
export async function exportVistaMagicaExcel({
  periodoLabel,
  periodoSlug,
  containerEl,
}) {
  if (!containerEl) {
    throw new Error("No se encontró el contenedor de la vista mágica");
  }

  const cards = containerEl.querySelectorAll("[data-vista-magica-export]");
  if (!cards.length) {
    throw new Error("No hay tarjetas para exportar");
  }

  await waitForPaint();

  const html2canvas = (await import("html2canvas")).default;
  const ExcelJS = (await import("exceljs")).default;

  const captures = [];
  for (const card of cards) {
    const canvas = await html2canvas(card, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true,
    });
    captures.push(dataUrlToBuffer(canvas.toDataURL("image/png")));
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CAP · Auditorías LPA";
  const sheet = workbook.addWorksheet("Vista magica", {
    views: [{ showGridLines: false }],
  });

  sheet.getCell("A1").value = "CAP · Vista mágica — Todas las sub áreas";
  sheet.getCell("A1").font = { bold: true, size: 14 };
  sheet.getCell("A2").value = `Periodo: ${periodoLabel}`;
  sheet.getCell("A2").font = { bold: true };
  sheet.getCell("A3").value = `Generado: ${new Date().toLocaleString("es-MX")}`;

  for (let c = 1; c <= COLS_PER_ROW * COL_STEP; c += 1) {
    sheet.getColumn(c).width = 4.5;
  }

  for (let r = 1; r <= HEADER_ROWS; r += 1) {
    sheet.getRow(r).height = 18;
  }

  captures.forEach((buffer, index) => {
    const imageId = workbook.addImage({
      buffer,
      extension: "png",
    });
    const col = (index % COLS_PER_ROW) * COL_STEP;
    const row = HEADER_ROWS + Math.floor(index / COLS_PER_ROW) * ROW_STEP;
    sheet.addImage(imageId, {
      tl: { col, row },
      ext: { width: IMG_WIDTH, height: IMG_HEIGHT },
    });
  });

  const slug = slugPeriodo(periodoSlug, periodoLabel);
  const out = await workbook.xlsx.writeBuffer();
  downloadBuffer(out, `CAP_vista_magica_${slug || "export"}.xlsx`);
}
