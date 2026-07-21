"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  MenuItem,
  Button,
} from "@mui/material";
import { FilterAltOff } from "@mui/icons-material";
import DashboardShell from "@/app/components/DashboardShell";
import { BRAND } from "@/libs/theme_palette";
import { COLOR_VENCIDA, colorEstadoAuditoria, esAuditoriaVencida } from "@/libs/auditoria_fechas";
import LeyendaAuditorias, {
  COLOR_TURNO_BLOQUEADO,
  COLOR_TURNO_OK,
} from "@/app/components/auditorias/LeyendaAuditorias";
import {
  MESES,
  aniosDisponibles,
  appendPeriodoParams,
  labelPeriodo,
  periodoActualParts,
} from "@/libs/periodo_ui";
import {
  mensajeTurnoActual,
  puedeAuditarEnHorario,
} from "@/libs/turno_horario";
import {
  PAGE_MAX_WIDTH,
  pageSubtitleSx,
  pageTitleSx,
  tableEmptyCellSx,
  tableHeadCellSx,
  tableHeadRowSx,
  tablePaperSx,
} from "@/libs/table_ui";

function getMiEmpId() {
  try {
    const raw = localStorage.getItem("infoUser");
    if (!raw) return "";
    const u = JSON.parse(raw);
    return u?.emp_id != null ? String(u.emp_id).trim() : "";
  } catch {
    return "";
  }
}

function MisAuditorias() {
  const router = useRouter();
  const actual = periodoActualParts();
  const [anio, setAnio] = useState(actual.anio);
  const [mes, setMes] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ahora, setAhora] = useState(() => new Date());

  const anios = useMemo(() => aniosDisponibles(actual.anio), [actual.anio]);
  const filtrosActivos = mes !== "" || anio !== actual.anio;
  const infoTurno = useMemo(() => mensajeTurnoActual(ahora), [ahora]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const empId = getMiEmpId();
      const params = new URLSearchParams();
      appendPeriodoParams(params, { anio, mes });
      if (empId) params.set("emp_id", empId);
      const res = await fetch(`/api/auditorias?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al cargar auditorías");
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
  }, [anio, mes]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const limpiarFiltros = () => {
    setAnio(actual.anio);
    setMes("");
  };

  const rowsOrdenadas = useMemo(() => {
    const score = (r) => {
      if (r.estado === "completada") return 2;
      if (puedeAuditarEnHorario(r.turno, ahora).ok) return 0;
      return 1;
    };
    return [...rows].sort((a, b) => score(a) - score(b));
  }, [rows, ahora]);

  const disponiblesAhora = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.estado !== "completada" && puedeAuditarEnHorario(r.turno, ahora).ok,
      ).length,
    [rows, ahora],
  );

  return (
    <DashboardShell selectedItemId="mis-auditorias">
      <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", width: "100%" }}>
        <Typography variant="h5" sx={pageTitleSx}>
          Mis auditorías
        </Typography>
        <Typography variant="body2" sx={pageSubtitleSx}>
          Por defecto se muestra el año actual. Elige un mes para acotar el periodo.
        </Typography>

        <Alert
          severity={infoTurno.turno ? "success" : "warning"}
          sx={{ mb: 2 }}
        >
          <Typography sx={{ fontWeight: 800, mb: 0.25 }}>
            {infoTurno.titulo}
            {infoTurno.turno ? ` · ${disponiblesAhora} disponible(s) ahora` : ""}
          </Typography>
          <Typography variant="body2">{infoTurno.detalle}</Typography>
        </Alert>

        <Paper
          sx={{
            p: 2,
            mb: 2,
            borderRadius: 1,
            border: `1px solid ${BRAND.border}`,
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <TextField
            select
            label="Año"
            size="small"
            value={anio}
            onChange={(e) => setAnio(e.target.value)}
            sx={{ minWidth: 110 }}
          >
            {anios.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Mes"
            size="small"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {MESES.map((m) => (
              <MenuItem key={m.value} value={m.value}>
                {m.label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="outlined"
            startIcon={<FilterAltOff />}
            disabled={!filtrosActivos}
            onClick={limpiarFiltros}
            sx={{ textTransform: "none" }}
          >
            Limpiar filtros
          </Button>
          <Typography variant="caption" sx={{ color: BRAND.muted, ml: "auto" }}>
            Periodo: {labelPeriodo(anio, mes)} · {rows.length} auditoría(s)
          </Typography>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <LeyendaAuditorias />

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
                    <TableCell sx={tableHeadCellSx}>Vencimiento</TableCell>
                    <TableCell sx={tableHeadCellSx}>Área</TableCell>
                    <TableCell sx={tableHeadCellSx}>Sub área</TableCell>
                    <TableCell sx={tableHeadCellSx}>Turno</TableCell>
                    <TableCell sx={tableHeadCellSx}>Tipo</TableCell>
                    <TableCell sx={tableHeadCellSx}>Estado</TableCell>
                    <TableCell sx={tableHeadCellSx}>%</TableCell>
                    <TableCell sx={tableHeadCellSx}>Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rowsOrdenadas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={tableEmptyCellSx}>
                        No tienes auditorías asignadas en {labelPeriodo(anio, mes)}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rowsOrdenadas.map((r) => {
                      const vencida = esAuditoriaVencida(r);
                      const cerrada = r.estado === "completada";
                      const enHorario = puedeAuditarEnHorario(r.turno, ahora).ok;
                      const bloqueadaPorTurno = !cerrada && !enHorario;

                      return (
                        <TableRow
                          key={r.id_auditoria}
                          hover
                          sx={{
                            cursor: "pointer",
                            opacity: bloqueadaPorTurno ? 0.72 : 1,
                            bgcolor: vencida
                              ? "rgba(198, 40, 40, 0.08)"
                              : enHorario && !cerrada
                                ? "rgba(46, 125, 50, 0.06)"
                                : undefined,
                            "& td": vencida ? { color: COLOR_VENCIDA } : undefined,
                          }}
                          onClick={() =>
                            router.push(`/dashboard/auditorias/${r.id_auditoria}`)
                          }
                        >
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                              <span>{r.fecha_programada}</span>
                              {vencida && (
                                <Chip
                                  size="small"
                                  label="Vencida"
                                  sx={{
                                    height: 20,
                                    fontWeight: 800,
                                    bgcolor: COLOR_VENCIDA,
                                    color: "#fff",
                                  }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{r.area_nombre}</TableCell>
                          <TableCell>{r.sub_area_nombre}</TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                              <Chip
                                size="small"
                                label={`Turno ${r.turno || "—"}`}
                                sx={{
                                  fontWeight: 700,
                                  width: "fit-content",
                                  bgcolor: vencida
                                    ? "rgba(198, 40, 40, 0.12)"
                                    : enHorario && !cerrada
                                      ? "rgba(46, 125, 50, 0.15)"
                                      : BRAND.soft,
                                  color: vencida
                                    ? COLOR_VENCIDA
                                    : enHorario && !cerrada
                                      ? COLOR_TURNO_OK
                                      : BRAND.primaryDark,
                                }}
                              />
                              {!cerrada && (
                                <Chip
                                  size="small"
                                  label={
                                    enHorario
                                      ? "Disponible ahora"
                                      : infoTurno.turno
                                        ? "Otro turno"
                                        : "Fuera de horario"
                                  }
                                  sx={{
                                    height: 20,
                                    fontWeight: 800,
                                    width: "fit-content",
                                    bgcolor: enHorario
                                      ? COLOR_TURNO_OK
                                      : COLOR_TURNO_BLOQUEADO,
                                    color: "#fff",
                                  }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>{r.tipo_nombre}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={r.estado}
                              sx={{
                                bgcolor: colorEstadoAuditoria(r.estado),
                                color: "#fff",
                                fontWeight: 600,
                                textTransform: "capitalize",
                              }}
                            />
                          </TableCell>
                          <TableCell
                            sx={{
                              fontWeight: 800,
                              color: vencida ? COLOR_VENCIDA : BRAND.primaryDark,
                            }}
                          >
                            {r.estado === "completada" && r.porcentaje != null
                              ? `${r.porcentaje}%`
                              : "—"}
                          </TableCell>
                          <TableCell
                            sx={{
                              color: vencida
                                ? COLOR_VENCIDA
                                : bloqueadaPorTurno
                                  ? COLOR_TURNO_BLOQUEADO
                                  : BRAND.primary,
                              fontWeight: 600,
                            }}
                          >
                            {cerrada
                              ? "Ver"
                              : enHorario
                                ? "Auditar"
                                : "Ver (bloqueada)"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Box>
    </DashboardShell>
  );
}

export default MisAuditorias;
