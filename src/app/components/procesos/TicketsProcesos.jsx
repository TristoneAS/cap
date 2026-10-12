"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Refresh } from "@mui/icons-material";
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

const ESTADO_COLOR = {
  resuelto: "#2E7D32",
  cerrado: "#1565C0",
};

function labelEstado(e) {
  const map = {
    resuelto: "Resuelto (pendiente verificación)",
    cerrado: "Cerrado",
  };
  return map[e] || e;
}

export default function TicketsProcesos() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("pendientes_procesos");
  const [error, setError] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [notasCierre, setNotasCierre] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "150", detalle: "1" });
      if (filtro) params.set("estado", filtro);
      const res = await fetch(`/api/procesos/tickets?${params}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "No se pudieron cargar los tickets");
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
  }, [filtro]);

  useEffect(() => {
    load();
  }, [load]);

  const abrirDetalle = (row) => {
    setDetalle(row);
    setNotasCierre("");
  };

  const cerrarTicket = async () => {
    if (!detalle || detalle.estado !== "resuelto") return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/procesos/tickets/${detalle.id_ticket}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notas_cierre: notasCierre }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "No se pudo cerrar el ticket");
        return;
      }
      setDetalle(null);
      load();
    } catch {
      setError("Error al cerrar");
    } finally {
      setSaving(false);
    }
  };

  const puedeCerrar = detalle?.estado === "resuelto";

  return (
    <DashboardShell selectedItemId="tickets-procesos">
      <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", width: "100%" }}>
        <Typography sx={pageTitleSx}>Cierre de tickets Poka Yoke</Typography>
        <Typography sx={pageSubtitleSx}>
          Tickets que Mantenimiento marcó como <strong>Resuelto</strong>. Verifique en planta y
          cierre el ticket cuando confirme que se realizó la corrección.
        </Typography>

        <Paper sx={{ ...tablePaperSx, px: 2, py: 1.5, mb: 1.5, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            select
            size="small"
            label="Vista"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="pendientes_procesos">Pendientes de cierre</MenuItem>
            <MenuItem value="cerrado">Cerrados</MenuItem>
            <MenuItem value="resuelto">Solo resueltos</MenuItem>
          </TextField>
          <Button size="small" startIcon={<Refresh />} onClick={load} sx={{ textTransform: "none" }}>
            Actualizar
          </Button>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: BRAND.primary }} />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={tablePaperSx}>
            <Table size="small">
              <TableHead>
                <TableRow sx={tableHeadRowSx}>
                  <TableCell sx={tableHeadCellSx}>#</TableCell>
                  <TableCell sx={tableHeadCellSx}>Estado</TableCell>
                  <TableCell sx={tableHeadCellSx}>Área / Sub área</TableCell>
                  <TableCell sx={tableHeadCellSx} align="center">
                    Hallazgos
                  </TableCell>
                  <TableCell sx={tableHeadCellSx}>Periodo</TableCell>
                  <TableCell sx={tableHeadCellSx}>Resuelto</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ py: 4, textAlign: "center", color: BRAND.muted }}>
                      No hay tickets con este filtro
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow
                      key={r.id_ticket}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => abrirDetalle(r)}
                    >
                      <TableCell sx={{ fontWeight: 700 }}>{r.id_ticket}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={labelEstado(r.estado)}
                          sx={{
                            bgcolor: `${ESTADO_COLOR[r.estado] || BRAND.muted}22`,
                            color: ESTADO_COLOR[r.estado] || BRAND.ink,
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.8rem" }}>
                        {r.area_nombre} · {r.sub_area_nombre}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>
                        {r.total_hallazgos ?? (r.hallazgos?.length || 0)}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.78rem" }}>{r.periodo_mes}</TableCell>
                      <TableCell sx={{ fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                        {String(r.fecha_resolucion || "—").slice(0, 16).replace("T", " ")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Dialog open={Boolean(detalle)} onClose={() => setDetalle(null)} fullWidth maxWidth="md">
          <DialogTitle sx={{ fontWeight: 800 }}>
            Ticket #{detalle?.id_ticket} · {detalle?.area_nombre} · {detalle?.sub_area_nombre}
          </DialogTitle>
          <DialogContent>
            {detalle && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 0.5 }}>
                <Typography variant="body2">
                  <strong>Periodo:</strong> {detalle.periodo_mes} ·{" "}
                  <strong>Estado:</strong> {labelEstado(detalle.estado)}
                </Typography>
                {(detalle.hallazgos || []).length > 0 ? (
                  <TableContainer component={Paper} sx={{ ...tablePaperSx, maxHeight: 280 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow sx={tableHeadRowSx}>
                          <TableCell sx={tableHeadCellSx}>Pregunta Poka</TableCell>
                          <TableCell sx={tableHeadCellSx}>Hallazgo</TableCell>
                          <TableCell sx={tableHeadCellSx}>Turno</TableCell>
                          <TableCell sx={tableHeadCellSx}>Responsable</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detalle.hallazgos.map((h) => (
                          <TableRow key={h.id_item}>
                            <TableCell sx={{ fontSize: "0.78rem" }}>{h.pregunta_poka}</TableCell>
                            <TableCell sx={{ fontSize: "0.78rem" }}>{h.hallazgo}</TableCell>
                            <TableCell sx={{ fontSize: "0.78rem" }}>{h.turno}</TableCell>
                            <TableCell sx={{ fontSize: "0.78rem" }}>
                              {h.emp_nombre_responsable || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : null}
                {detalle.notas_resolucion ? (
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Notas de Mantenimiento"
                    value={detalle.notas_resolucion}
                    InputProps={{ readOnly: true }}
                  />
                ) : null}
                {puedeCerrar ? (
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    label="Notas de verificación / cierre (Procesos)"
                    value={notasCierre}
                    onChange={(e) => setNotasCierre(e.target.value)}
                    helperText="Opcional. Al cerrar, el ticket deja de aparecer en pendientes."
                  />
                ) : (
                  detalle.notas_cierre && (
                    <TextField
                      fullWidth
                      multiline
                      minRows={2}
                      label="Notas de cierre (Procesos)"
                      value={detalle.notas_cierre}
                      InputProps={{ readOnly: true }}
                    />
                  )
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetalle(null)} sx={{ textTransform: "none" }}>
              Salir
            </Button>
            {puedeCerrar && (
              <Button
                variant="contained"
                disabled={saving}
                onClick={cerrarTicket}
                sx={{ textTransform: "none", bgcolor: BRAND.primary }}
              >
                {saving ? "Cerrando…" : "Cerrar ticket"}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardShell>
  );
}
