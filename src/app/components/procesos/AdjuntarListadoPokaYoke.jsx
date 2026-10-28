"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import {
  Close,
  CloudUpload,
  Delete,
  Download,
  Refresh,
  Visibility,
} from "@mui/icons-material";
import DashboardShell from "@/app/components/DashboardShell";
import { BRAND } from "@/libs/theme_palette";
import {
  PAGE_MAX_WIDTH,
  pageSubtitleSx,
  pageTitleSx,
  tableHeadCellSx,
  tableHeadRowSx,
  tablePaperSx,
} from "@/libs/table_ui";

function formatBytes(n) {
  const v = Number(n) || 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(2)} MB`;
}

function isPdfFile(row) {
  const name = String(row?.nombre_original ?? "").toLowerCase();
  const mime = String(row?.mime_type ?? "").toLowerCase();
  return name.endsWith(".pdf") || mime.includes("pdf");
}

function previewUrl(id) {
  return `/api/procesos/poka-yoke-listados/${id}?view=1`;
}

function getUploaderFromStorage() {
  if (typeof window === "undefined") return { emp_id: "", emp_nombre: "" };
  try {
    const raw = localStorage.getItem("infoUser");
    const emp = raw ? JSON.parse(raw) : null;
    const emp_id = emp?.emp_id != null ? String(emp.emp_id).trim() : "";
    const parts = [
      emp?.emp_nombre,
      emp?.emp_apellido_paterno,
      emp?.emp_apellido_materno,
    ].filter(Boolean);
    return { emp_id, emp_nombre: parts.join(" ").trim() };
  } catch {
    return { emp_id: "", emp_nombre: "" };
  }
}

export default function AdjuntarListadoPokaYoke() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [file, setFile] = useState(null);
  const [comentario, setComentario] = useState("");
  const [previewRow, setPreviewRow] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [idClienteUpload, setIdClienteUpload] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");

  const loadClientes = useCallback(async () => {
    try {
      const res = await fetch("/api/procesos/clientes");
      const data = await res.json();
      if (res.ok && data.success) {
        setClientes(data.data || []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ limit: "100" });
      if (filtroCliente) qs.set("id_cliente", filtroCliente);
      const res = await fetch(`/api/procesos/poka-yoke-listados?${qs}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "No se pudo cargar el listado de archivos");
        setRows([]);
        return;
      }
      setRows(data.data || []);
    } catch {
      setError("Error de conexión");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filtroCliente]);

  useEffect(() => {
    loadClientes();
  }, [loadClientes]);

  useEffect(() => {
    load();
  }, [load]);

  function clienteLabel(c) {
    if (!c) return "—";
    const id = c.cliente_id ?? c.id_cliente;
    const nom = c.cliente_nombre ?? c.cliente;
    if (id != null && nom) return `${id} — ${nom}`;
    return nom || (id != null ? String(id) : "—");
  }

  const handleDelete = async (row) => {
    const nombre = row.nombre_original || "este archivo";
    if (
      !confirm(
        `¿Eliminar "${nombre}"?\n\nSe borrará del servidor y no se podrá recuperar.`,
      )
    ) {
      return;
    }
    setDeletingId(row.id_listado);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/procesos/poka-yoke-listados/${row.id_listado}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "No se pudo eliminar");
        return;
      }
      if (previewRow?.id_listado === row.id_listado) {
        setPreviewRow(null);
      }
      setSuccess(data.message || "Eliminado");
      load();
    } catch {
      setError("Error de conexión al eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUpload = async () => {
    if (!idClienteUpload) {
      setError("Seleccione un cliente");
      return;
    }
    if (!file) {
      setError("Seleccione un archivo");
      return;
    }
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const { emp_id, emp_nombre } = getUploaderFromStorage();
      const fd = new FormData();
      fd.append("file", file);
      fd.append("comentario", comentario);
      fd.append("id_cliente", idClienteUpload);
      if (emp_id) fd.append("emp_id", emp_id);
      if (emp_nombre) fd.append("emp_nombre", emp_nombre);

      const res = await fetch("/api/procesos/poka-yoke-listados", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "No se pudo adjuntar el archivo");
        return;
      }
      setSuccess(data.message || "Archivo adjuntado");
      const uploadedId = data.data?.id_listado;
      const uploadedName = data.data?.nombre_original || file.name;
      const uploadedPdf =
        String(uploadedName).toLowerCase().endsWith(".pdf") ||
        String(file.type || "").includes("pdf");
      setFile(null);
      setComentario("");
      const input = document.getElementById("poka-listado-file-input");
      if (input) input.value = "";
      await load();
      if (uploadedId && uploadedPdf) {
        setPreviewRow({
          id_listado: uploadedId,
          nombre_original: uploadedName,
        });
      }
    } catch {
      setError("Error de conexión al subir");
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardShell selectedItemId="adjuntar-listado-poka-yoke">
      <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", py: 2, px: { xs: 1, sm: 2 } }}>
        <Typography sx={pageTitleSx}>Adjuntar listado Poka Yoke</Typography>
        <Typography sx={pageSubtitleSx}>
          Suba el listado en PDF para visualizarlo en pantalla (también Excel, CSV o Word para
          descarga).
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Nuevo adjunto</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 520 }}>
            <FormControl size="small" required>
              <InputLabel id="poka-listado-cliente-label">Cliente</InputLabel>
              <Select
                labelId="poka-listado-cliente-label"
                label="Cliente"
                value={idClienteUpload}
                onChange={(e) => setIdClienteUpload(e.target.value)}
              >
                {clientes.map((c) => (
                  <MenuItem key={c.id_cliente} value={String(c.id_cliente)}>
                    {c.id_cliente} — {c.cliente}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {clientes.length === 0 && (
              <Typography variant="body2" sx={{ color: BRAND.muted }}>
                Agregue clientes en Procesos → Clientes antes de adjuntar listados.
              </Typography>
            )}
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUpload />}
              sx={{ textTransform: "none", alignSelf: "flex-start" }}
            >
              Elegir archivo
              <input
                id="poka-listado-file-input"
                type="file"
                hidden
                accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </Button>
            {file && (
              <Typography variant="body2" sx={{ color: BRAND.muted }}>
                {file.name} ({formatBytes(file.size)})
              </Typography>
            )}
            <TextField
              label="Comentario (opcional)"
              size="small"
              multiline
              minRows={2}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
            <Button
              variant="contained"
              disabled={!file || !idClienteUpload || uploading}
              onClick={handleUpload}
              sx={{
                textTransform: "none",
                alignSelf: "flex-start",
                bgcolor: BRAND.primary,
                "&:hover": { bgcolor: BRAND.primaryDark },
              }}
            >
              {uploading ? "Subiendo…" : "Adjuntar listado"}
            </Button>
          </Box>
        </Paper>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 700, flex: 1, minWidth: 160 }}>Archivos adjuntos</Typography>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="poka-filtro-cliente-label">Filtrar por cliente</InputLabel>
            <Select
              labelId="poka-filtro-cliente-label"
              label="Filtrar por cliente"
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {clientes.map((c) => (
                <MenuItem key={c.id_cliente} value={String(c.id_cliente)}>
                  {c.id_cliente} — {c.cliente}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            size="small"
            startIcon={<Refresh />}
            onClick={load}
            sx={{ textTransform: "none" }}
          >
            Actualizar
          </Button>
        </Box>

        <Paper sx={tablePaperSx}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress sx={{ color: BRAND.primary }} />
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={tableHeadRowSx}>
                    <TableCell sx={tableHeadCellSx}>Archivo</TableCell>
                    <TableCell sx={tableHeadCellSx}>Cliente</TableCell>
                    <TableCell sx={tableHeadCellSx}>Tamaño</TableCell>
                    <TableCell sx={tableHeadCellSx}>Subido por</TableCell>
                    <TableCell sx={tableHeadCellSx}>Fecha</TableCell>
                    <TableCell sx={tableHeadCellSx}>Comentario</TableCell>
                    <TableCell sx={tableHeadCellSx} align="right">
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: BRAND.muted }}>
                        Aún no hay listados adjuntos
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.id_listado} hover>
                        <TableCell>{r.nombre_original}</TableCell>
                        <TableCell>{clienteLabel(r)}</TableCell>
                        <TableCell>{formatBytes(r.tamano_bytes)}</TableCell>
                        <TableCell>
                          {r.emp_nombre_subio || r.emp_id_subio || "—"}
                        </TableCell>
                        <TableCell>
                          {r.fecha_creacion
                            ? new Date(r.fecha_creacion).toLocaleString("es-MX")
                            : "—"}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 200 }}>{r.comentario || "—"}</TableCell>
                        <TableCell align="right">
                          <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end", flexWrap: "wrap" }}>
                            {isPdfFile(r) && (
                              <Button
                                size="small"
                                startIcon={<Visibility />}
                                onClick={() => setPreviewRow(r)}
                                sx={{ textTransform: "none" }}
                              >
                                Ver PDF
                              </Button>
                            )}
                            <Button
                              size="small"
                              startIcon={<Download />}
                              href={`/api/procesos/poka-yoke-listados/${r.id_listado}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ textTransform: "none" }}
                            >
                              Descargar
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              startIcon={<Delete />}
                              disabled={deletingId === r.id_listado}
                              onClick={() => handleDelete(r)}
                              sx={{ textTransform: "none" }}
                            >
                              Eliminar
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        <Dialog
          open={Boolean(previewRow)}
          onClose={() => setPreviewRow(null)}
          fullWidth
          maxWidth="lg"
          slotProps={{
            paper: {
              sx: { height: "90vh", maxHeight: 900, display: "flex", flexDirection: "column" },
            },
          }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              py: 1.5,
              pr: 1,
            }}
          >
            <Typography component="span" sx={{ flex: 1, fontWeight: 700 }} noWrap>
              {previewRow?.nombre_original || "Vista previa PDF"}
            </Typography>
            <IconButton aria-label="Cerrar" onClick={() => setPreviewRow(null)} size="small">
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0, flex: 1, display: "flex", minHeight: 0 }}>
            {previewRow?.id_listado && (
              <Box
                component="iframe"
                title={previewRow.nombre_original}
                src={previewUrl(previewRow.id_listado)}
                sx={{
                  border: 0,
                  width: "100%",
                  flex: 1,
                  minHeight: "70vh",
                  bgcolor: "#525659",
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </DashboardShell>
  );
}
