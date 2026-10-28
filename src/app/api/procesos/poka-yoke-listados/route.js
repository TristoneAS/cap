import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";
import { jsonError, jsonOk } from "@/libs/api_helpers";
import { getProcesoClienteActivoById } from "@/libs/procesos_clientes";
import {
  ensurePokaListadosUploadDir,
  insertPokaYokeListado,
  isAllowedListadoExtension,
  listPokaYokeListados,
  POKA_LISTADO_MAX_BYTES,
  sanitizeOriginalName,
} from "@/libs/poka_yoke_listados";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const idCliente = searchParams.get("id_cliente");
    const rows = await listPokaYokeListados(limit, idCliente);
    return jsonOk(rows);
  } catch (error) {
    return jsonError("Error al listar archivos", 500, error.message);
  }
}

export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const comentario = String(form.get("comentario") ?? "").trim() || null;
    const empId = String(form.get("emp_id") ?? "").trim() || null;
    const empNombre = String(form.get("emp_nombre") ?? "").trim() || null;
    const idClienteRaw = String(form.get("id_cliente") ?? "").trim();
    const idCliente = idClienteRaw ? Number(idClienteRaw) : null;

    if (!file || typeof file === "string") {
      return jsonError("Seleccione un archivo", 400);
    }

    if (!idCliente) {
      return jsonError("Seleccione un cliente", 400);
    }
    const clienteRow = await getProcesoClienteActivoById(idCliente);
    if (!clienteRow) {
      return jsonError("Cliente no válido o inactivo", 400);
    }

    const originalName = sanitizeOriginalName(file.name);
    if (!isAllowedListadoExtension(originalName)) {
      return jsonError(
        "Formato no permitido. Use PDF, Excel (.xlsx, .xls), CSV o Word (.doc, .docx)",
        400,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > POKA_LISTADO_MAX_BYTES) {
      return jsonError("El archivo supera el límite de 15 MB", 400);
    }
    if (buffer.length === 0) {
      return jsonError("El archivo está vacío", 400);
    }

    const ext = path.extname(originalName).toLowerCase();
    const storedName = `${randomUUID()}${ext}`;
    const dir = await ensurePokaListadosUploadDir();
    const fullPath = path.join(dir, storedName);
    await fs.writeFile(fullPath, buffer);

    const id = await insertPokaYokeListado({
      nombre_original: originalName,
      nombre_almacenado: storedName,
      mime_type: file.type || null,
      tamano_bytes: buffer.length,
      emp_id_subio: empId,
      emp_nombre_subio: empNombre,
      comentario,
      id_cliente: idCliente,
    });

    return jsonOk(
      { id_listado: id, nombre_original: originalName },
      "Listado Poka Yoke adjuntado correctamente",
      201,
    );
  } catch (error) {
    return jsonError("Error al guardar el archivo", 500, error.message);
  }
}
