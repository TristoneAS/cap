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
  abierto: "#C62828",
  en_proceso: "#EF6C00",
  resuelto: "#2E7D32",
  cerrado: "#1565C0",
  cancelado: "#78909C",
};

function labelEstado(e) {
  const map = {
    abierto: "Abierto",
    en_proceso: "En proceso",
    resuelto: "Resuelto (en Procesos)",
    cerrado: "Cerrado",
    cancelado: "Cancelado",
  };
  return map[e] || e;
}

export default function TicketsMantenimiento() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("activos");
  const [error, setError] = useState("");
  const [detalle, setDetalle] = useState(null);
  const [estadoEdit, setEstadoEdit] = useState("");
  const [notasEdit, setNotasEdit] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: "150", detalle: "1" });
      if (filtro) params.set("estado", filtro);
      const res = await fetch(`/api/mantenimiento/tickets?${params}`);
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

  const soloConsulta =
    detalle && ["resuelto", "cerrado", "cancelado"].includes(detalle.estado);

  const abrirDetalle = (row) => {
    setDetalle(row);
    setEstadoEdit(row.estado);
    setNotasEdit(row.notas_resolucion || "");
  };

  const guardarDetalle = async () => {
    if (!detalle) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/mantenimiento/tickets/${detalle.id_ticket}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: estadoEdit,
          notas_resolucion: notasEdit,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "No se pudo actualizar");
        return;
      }
      setDetalle(null);
      load();
    } catch {
      setError("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell selectedItemId="tickets-mantenimiento">
      <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", width: "100%" }}>
        <Typography sx={pageTitleSx}>Tickets de mantenimiento</Typography>
        <Typography sx={pageSubtitleSx}>
          Un ticket por área y sub área en el periodo: agrupa hallazgos Poka Yoke (No) del mes.
          Marque <strong>Resuelto</strong> cuando termine el trabajo; el cierre final lo hace Procesos
          tras verificar.
        </Typography>

        <Paper sx={{ ...tablePaperSx, px: 2, py: 1.5, mb: 1.5, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <TextField
            select
            size="small"
            label="Estado"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="activos">Activos (abierto / en proceso)</MenuItem>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="abierto">Abierto</MenuItem>
            <MenuItem value="en_proceso">En proceso</MenuItem>
            <MenuItem value="resuelto">Resuelto (enviado a Procesos)</MenuItem>
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
                  <TableCell sx={tableHeadCellSx}>Actualizado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 4, textAlign: "center", color: BRAND.muted }}>
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
                        {String(r.fecha_modificacion || r.fecha_creacion || "")
                          .slice(0, 16)
                          .replace("T", " ")}
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
                  <strong>Hallazgos:</strong>{" "}
                  {detalle.hallazgos?.length ?? detalle.total_hallazgos ?? 0}
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
                ) : (
                  <Typography variant="body2" sx={{ color: BRAND.muted }}>
                    Sin hallazgos vinculados
                  </Typography>
                )}
                {soloConsulta ? (
                  <Alert severity="info">
                    Este ticket ya está en Procesos o cerrado. Mantenimiento no puede modificarlo.
                  </Alert>
                ) : (
                  <>
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Estado"
                      value={estadoEdit}
                      onChange={(e) => setEstadoEdit(e.target.value)}
                      helperText="Use Resuelto cuando el trabajo esté listo; no cierra el ticket."
                    >
                      <MenuItem value="abierto">Abierto</MenuItem>
                      <MenuItem value="en_proceso">En proceso</MenuItem>
                      <MenuItem value="resuelto">Resuelto (enviar a Procesos)</MenuItem>
                    </TextField>
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      label="Notas de resolución (Mantenimiento)"
                      value={notasEdit}
                      onChange={(e) => setNotasEdit(e.target.value)}
                    />
                  </>
                )}
                {detalle.notas_cierre ? (
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    label="Notas de cierre (Procesos)"
                    value={detalle.notas_cierre}
                    InputProps={{ readOnly: true }}
                  />
                ) : null}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetalle(null)} sx={{ textTransform: "none" }}>
              Cerrar
            </Button>
            {!soloConsulta && (
              <Button
                variant="contained"
                disabled={saving}
                onClick={guardarDetalle}
                sx={{ textTransform: "none", bgcolor: BRAND.primary }}
              >
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardShell>
  );
}
