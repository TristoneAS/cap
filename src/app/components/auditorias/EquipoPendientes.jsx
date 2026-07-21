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
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  MenuItem,
} from "@mui/material";
import {
  Visibility,
  Groups,
  ExpandMore,
  FilterAltOff,
} from "@mui/icons-material";
import DashboardShell from "@/app/components/DashboardShell";
import { BRAND } from "@/libs/theme_palette";
import { COLOR_VENCIDA, colorEstadoAuditoria, esAuditoriaVencida } from "@/libs/auditoria_fechas";
import {
  MESES,
  aniosDisponibles,
  appendPeriodoParams,
  labelPeriodo,
  periodoActualParts,
} from "@/libs/periodo_ui";
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

function chipEstado(estado) {
  const bgcolor = colorEstadoAuditoria(estado);
  return (
    <Chip
      size="small"
      label={estado}
      sx={{ bgcolor, color: "#fff", fontWeight: 600, textTransform: "capitalize" }}
    />
  );
}

function EquipoPendientes() {
  const router = useRouter();
  const actual = periodoActualParts();
  const [anio, setAnio] = useState(actual.anio);
  const [mes, setMes] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [empIdJefe, setEmpIdJefe] = useState("");
  const [expanded, setExpanded] = useState(false);

  const anios = useMemo(() => aniosDisponibles(actual.anio), [actual.anio]);
  const filtrosActivos = mes !== "" || anio !== actual.anio;

  useEffect(() => {
    setEmpIdJefe(getMiEmpId());
  }, []);

  const load = useCallback(async () => {
    const jefe = empIdJefe || getMiEmpId();
    if (!jefe) {
      setError("No se encontró su emp_id de sesión");
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ emp_id_jefe: jefe });
      appendPeriodoParams(params, { anio, mes });
      const res = await fetch(`/api/empleados/mi-equipo?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Error al cargar el equipo");
        setData(null);
        return;
      }
      setData(json.data);
      setExpanded(false);
    } catch {
      setError("Error de conexión");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [empIdJefe, anio, mes]);

  useEffect(() => {
    if (!empIdJefe) return;
    load();
  }, [empIdJefe, load]);

  const limpiarFiltros = () => {
    setAnio(actual.anio);
    setMes("");
  };

  const equipo = data?.equipo || [];

  return (
    <DashboardShell selectedItemId="mi-equipo">
      <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", width: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <Groups sx={{ color: BRAND.primary }} />
          <Typography variant="h5" sx={pageTitleSx}>
            Mi equipo · pendientes
          </Typography>
        </Box>
        <Typography variant="body2" sx={pageSubtitleSx}>
          Personas a su cargo con auditorías pendientes o en progreso.
          Haz clic en una persona para ver el detalle.
        </Typography>

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
            Periodo: {labelPeriodo(anio, mes)}
            {data
              ? ` · ${data.total_personas} persona(s) · ${data.total_auditorias} pendiente(s)`
              : ""}
            {data?.total_subordinados != null
              ? ` · ${data.total_subordinados} a cargo`
              : ""}
          </Typography>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper
          sx={{
            borderRadius: 1,
            overflow: "hidden",
            border: `1px solid ${BRAND.border}`,
          }}
        >
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress sx={{ color: BRAND.primary }} />
            </Box>
          ) : equipo.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center", color: BRAND.muted }}>
              {data?.total_subordinados > 0
                ? "Todo su equipo ya completó las auditorías del periodo (o no tienen asignaciones pendientes)."
                : "No hay personas a su cargo registradas con su emp_id como jefe."}
            </Box>
          ) : (
            <Box>
              {equipo.map((persona) => {
                const panelId = String(persona.emp_id);
                const isOpen = expanded === panelId;
                return (
                  <Accordion
                    key={panelId}
                    disableGutters
                    elevation={0}
                    expanded={isOpen}
                    onChange={(_, open) => setExpanded(open ? panelId : false)}
                    sx={{
                      borderBottom: `1px solid ${BRAND.border}`,
                      "&:before": { display: "none" },
                      bgcolor: BRAND.paper,
                    }}
                  >
                    <AccordionSummary
                      expandIcon={<ExpandMore sx={{ color: BRAND.primary }} />}
                      sx={{
                        px: 2,
                        minHeight: 56,
                        bgcolor: isOpen ? BRAND.soft : BRAND.paper,
                        borderBottom: isOpen
                          ? `1px solid ${BRAND.border}`
                          : "none",
                        "& .MuiAccordionSummary-content": {
                          my: 1.25,
                          alignItems: "center",
                          gap: 1.5,
                        },
                        "&:hover": { bgcolor: BRAND.soft },
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 800, color: BRAND.ink }}>
                          {persona.nombre_completo}
                        </Typography>
                        <Typography variant="caption" sx={{ color: BRAND.muted }}>
                          emp_id: {persona.emp_id}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={`${persona.total_pendientes} pendiente${persona.total_pendientes === 1 ? "" : "s"}`}
                        sx={{
                          fontWeight: 700,
                          bgcolor: BRAND.primary,
                          color: "#fff",
                          mr: 1,
                        }}
                      />
                    </AccordionSummary>
                    <AccordionDetails
                      sx={{
                        px: 2,
                        pt: 2,
                        pb: 2,
                        bgcolor: BRAND.paper,
                      }}
                    >
                      <TableContainer
                        sx={{
                          border: `1px solid ${BRAND.border}`,
                          borderRadius: 1,
                          overflow: "hidden",
                        }}
                      >
                        <Table size="small">
                          <TableHead>
                            <TableRow sx={tableHeadRowSx}>
                              <TableCell sx={tableHeadCellSx}>Área</TableCell>
                              <TableCell sx={tableHeadCellSx}>Sub área</TableCell>
                              <TableCell sx={tableHeadCellSx}>Turno</TableCell>
                              <TableCell sx={tableHeadCellSx}>Tipo</TableCell>
                              <TableCell sx={tableHeadCellSx}>Vence</TableCell>
                              <TableCell sx={tableHeadCellSx}>Estado</TableCell>
                              <TableCell sx={tableHeadCellSx} align="right">
                                Acción
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {persona.auditorias_pendientes.map((aud) => {
                              const vencida = esAuditoriaVencida(aud);
                              return (
                                <TableRow
                                  key={aud.id_auditoria}
                                  hover
                                  sx={{
                                    bgcolor: vencida
                                      ? "rgba(198, 40, 40, 0.06)"
                                      : BRAND.paper,
                                  }}
                                >
                                  <TableCell>{aud.area_nombre}</TableCell>
                                  <TableCell>{aud.sub_area_nombre}</TableCell>
                                  <TableCell>
                                    <Chip
                                      size="small"
                                      label={`Turno ${aud.turno || "—"}`}
                                      sx={{
                                        fontWeight: 700,
                                        bgcolor: BRAND.soft,
                                        color: BRAND.primaryDark,
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell>{aud.tipo_nombre}</TableCell>
                                  <TableCell>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0.75,
                                      }}
                                    >
                                      <span
                                        style={{
                                          color: vencida
                                            ? COLOR_VENCIDA
                                            : undefined,
                                          fontWeight: vencida ? 700 : undefined,
                                        }}
                                      >
                                        {aud.fecha_programada || "—"}
                                      </span>
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
                                  <TableCell>{chipEstado(aud.estado)}</TableCell>
                                  <TableCell align="right">
                                    <Button
                                      size="small"
                                      startIcon={<Visibility />}
                                      onClick={() =>
                                        router.push(
                                          `/dashboard/auditorias/${aud.id_auditoria}`,
                                        )
                                      }
                                      sx={{
                                        textTransform: "none",
                                        color: BRAND.primary,
                                        fontWeight: 700,
                                      }}
                                    >
                                      Ver
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
          )}
        </Paper>
      </Box>
    </DashboardShell>
  );
}

export default EquipoPendientes;
