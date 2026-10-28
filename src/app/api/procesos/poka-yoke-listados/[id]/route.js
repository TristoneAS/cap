import fs from "fs/promises";
import { jsonError, jsonOk, parseId } from "@/libs/api_helpers";
import {
  deletePokaYokeListado,
  getPokaYokeListadoById,
  resolveListadoFilePath,
} from "@/libs/poka_yoke_listados";

function isPdfListado(row) {
  const name = String(row.nombre_original ?? "").toLowerCase();
  const mime = String(row.mime_type ?? "").toLowerCase();
  return name.endsWith(".pdf") || mime.includes("pdf");
}

export async function GET(request, { params }) {
  try {
    const id = Number(parseId(await params, "id"));
    if (!id) return jsonError("Id inválido", 400);

    const { searchParams } = new URL(request.url);
    const inline =
      searchParams.get("view") === "1" || searchParams.get("inline") === "1";

    const row = await getPokaYokeListadoById(id);
    if (!row) return jsonError("Archivo no encontrado", 404);

    if (inline && !isPdfListado(row)) {
      return jsonError("La vista previa solo está disponible para archivos PDF", 400);
    }

    const filePath = resolveListadoFilePath(row.nombre_almacenado);
    if (!filePath) return jsonError("Ruta de archivo inválida", 500);

    let buffer;
    try {
      buffer = await fs.readFile(filePath);
    } catch {
      return jsonError("El archivo ya no existe en el servidor", 404);
    }

    const mime = inline
      ? "application/pdf"
      : row.mime_type || "application/octet-stream";

    const disposition = inline ? "inline" : "attachment";
    const filename = encodeURIComponent(row.nombre_original);

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `${disposition}; filename="${filename}"; filename*=UTF-8''${filename}`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    return jsonError("Error al descargar", 500, error.message);
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = Number(parseId(await params, "id"));
    if (!id) return jsonError("Id inválido", 400);

    const result = await deletePokaYokeListado(id);
    if (!result.ok) {
      return jsonError(result.error, result.status || 500);
    }

    return jsonOk(null, `Listado eliminado: ${result.nombre}`);
  } catch (error) {
    return jsonError("Error al eliminar", 500, error.message);
  }
}
