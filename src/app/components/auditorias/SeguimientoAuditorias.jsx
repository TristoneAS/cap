"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Visibility, ArrowBack, FilterAltOff, EditNote, SwapHoriz } from "@mui/icons-material";
import DashboardShell from "@/app/components/DashboardShell";
import { isAdminClient } from "@/libs/dashboard_access";
import { BRAND } from "@/libs/theme_palette";
import { COLOR_VENCIDA, colorEstadoAuditoria, esAuditoriaVencida } from "@/libs/auditoria_fechas";
import LeyendaAuditorias from "@/app/components/auditorias/LeyendaAuditorias";
import {
  MESES,
  aniosDisponibles,
  appendPeriodoParams,
  labelPeriodo,
  parsePeriodoMes,
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

function SeguimientoAuditorias() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const actual = periodoActualParts();
  const [isAdmin] = useState(() => isAdminClient());
  const periodoQuery = searchParams.get("periodo_mes");
  const inicial = periodoQuery
    ? parsePeriodoMes(periodoQuery)
    : { anio: actual.anio, mes: "" };
  const [anio, setAnio] = useState(inicial.anio);
  const [mes, setMes] = useState(inicial.mes);
  const [filtroArea, setFiltroArea] = useState(
    () => searchParams.get("id_area") || "",
  );
  const [filtroSubArea, setFiltroSubArea] = useState(
    () => searchParams.get("id_sub_area") || "",
  );
  const [filtroAuditor, setFiltroAuditor] = useState(
    () => searchParams.get("emp_id") || "",
  );
  const [rows, setRows] = useState([]);
  const [areas, setAreas] = useState([]);
  const [subAreas, setSubAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [reasignarRow, setReasignarRow] = useState(null);
  const [reasignarForm, setReasignarForm] = useState({
    id_area: "",
    id_sub_area: "",
    id_tipo_auditoria: "",
    turno: "",
  });
  const [reasignarSubAreas, setReasignarSubAreas] = useState([]);
  const [reasignarTipos, setReasignarTipos] = useState([]);
  const [reasignarTurnos, setReasignarTurnos] = useState([]);
  const [reasignarSaving, setReasignarSaving] = useState(false);
  const [reasignarError, setReasignarError] = useState("");
  const [reasignarSuccess, setReasignarSuccess] = useState("");

  const anios = useMemo(() => aniosDisponibles(actual.anio), [actual.anio]);
  const filtrosActivos =
    mes !== "" ||
    anio !== actual.anio ||
    !!filtroArea ||
    !!filtroSubArea ||
    !!filtroAuditor;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      appendPeriodoParams(params, { anio, mes });
      const [audRes, areasRes] = await Promise.all([
        fetch(`/api/auditorias?${params.toString()}`),
        fetch("/api/areas"),
      ]);
      const audData = await audRes.json();
      const areasData = await areasRes.json();
      if (!audRes.ok) {
        setError(audData.error || "Error al cargar auditorías");
        setRows([]);
        return;
      }
      setRows(audData.data || []);
      setAreas(areasData.success ? areasData.data || [] : []);
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
    if (!filtroArea) {
      setSubAreas([]);
      setFiltroSubArea("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/sub-areas?id_area=${encodeURIComponent(filtroArea)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        const list = res.ok && data.success ? data.data || [] : [];
        setSubAreas(list);
        setFiltroSubArea((prev) => {
          if (!prev) return "";
          const ok = list.some((sa) => String(sa.id_sub_area) === String(prev));
          return ok ? prev : "";
        });
      } catch {
        if (!cancelled) setSubAreas([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filtroArea]);

  const abrirDetalle = async (id) => {
    setSelectedId(id);
    setLoadingDetalle(true);
    setDetalle(null);
    setError("");
    try {
      const res = await fetch(`/api/auditorias/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al cargar detalle");
        return;
      }
      setDetalle(data.data);
    } catch {
      setError("Error de conexión al cargar detalle");
    } finally {
      setLoadingDetalle(false);
    }
  };

  const cerrarDetalle = () => {
    setSelectedId(null);
    setDetalle(null);
  };

  const filtradas = useMemo(() => {
    const q = String(filtroAuditor || "")
      .trim()
      .toLowerCase();
    return rows.filter((r) => {
      if (filtroArea && String(r.id_area) !== String(filtroArea)) return false;
      if (filtroSubArea && String(r.id_sub_area) !== String(filtroSubArea)) {
        return false;
      }
      if (q) {
        const empId = String(r.emp_id ?? "")
          .trim()
          .toLowerCase();
        const nombre = String(r.emp_nombre ?? "")
          .trim()
          .toLowerCase();
        if (!empId.includes(q) && !nombre.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filtroArea, filtroSubArea, filtroAuditor]);

  const cerrarReasignar = () => {
    setReasignarRow(null);
    setReasignarForm({
      id_area: "",
      id_sub_area: "",
      id_tipo_auditoria: "",
      turno: "",
    });
    setReasignarSubAreas([]);
    setReasignarTipos([]);
    setReasignarTurnos([]);
    setReasignarError("");
  };

  const abrirReasignar = (row) => {
    setReasignarRow(row);
    setReasignarForm({
      id_area: "",
      id_sub_area: "",
      id_tipo_auditoria: "",
      turno: "",
    });
    setReasignarSubAreas([]);
    setReasignarTipos([]);
    setReasignarTurnos([]);
    setReasignarError("");
    setReasignarSuccess("");
  };

  useEffect(() => {
    if (!reasignarRow || !reasignarForm.id_area) {
      setReasignarSubAreas([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/sub-areas?id_area=${encodeURIComponent(reasignarForm.id_area)}`,
        );
        const data = await res.json();
        if (cancelled) return;
        setReasignarSubAreas(res.ok && data.success ? data.data || [] : []);
      } catch {
        if (!cancelled) setReasignarSubAreas([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reasignarRow, reasignarForm.id_area]);

  useEffect(() => {
    if (!reasignarForm.id_area || !reasignarForm.id_sub_area) {
      setReasignarTipos([]);
      setReasignarTurnos([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({
          id_area: reasignarForm.id_area,
          id_sub_area: reasignarForm.id_sub_area,
        });
        const res = await fetch(`/api/auditorias/tipos-por-alcance?${params.toString()}`);
        const data = await res.json();
        if (cancelled) return;
        setReasignarTipos(res.ok && data.success ? data.data || [] : []);
      } catch {
        if (!cancelled) setReasignarTipos([]);
      }
    })();

    const sub = reasignarSubAreas.find(
      (sa) => String(sa.id_sub_area) === String(reasignarForm.id_sub_area),
    );
    setReasignarTurnos(sub?.turnos || []);

    return () => {
      cancelled = true;
    };
  }, [
    reasignarForm.id_area,
    reasignarForm.id_sub_area,
    reasignarSubAreas,
  ]);

  const guardarReasignacion = async () => {
    if (!reasignarRow) return;
    const { id_area, id_sub_area, id_tipo_auditoria, turno } = reasignarForm;
    if (!id_area || !id_sub_area || !id_tipo_auditoria || !turno) {
      setReasignarError("Complete área, sub área, tipo y turno");
      return;
    }

    const msg =
      `Se eliminará por completo la auditoría actual:\n` +
      `${reasignarRow.area_nombre} · ${reasignarRow.sub_area_nombre} · Turno ${reasignarRow.turno}\n\n` +
      `No contará en reportes del mes. Se creará la nueva asignación para ${reasignarRow.emp_nombre}.\n\n` +
      `¿Continuar?`;

    if (!confirm(msg)) return;

    setReasignarSaving(true);
    setReasignarError("");
    try {
      const res = await fetch(`/api/auditorias/${reasignarRow.id_auditoria}/reasignar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_area: Number(id_area),
          id_sub_area: Number(id_sub_area),
          id_tipo_auditoria: Number(id_tipo_auditoria),
          turno,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReasignarError(data.error || "Error al reasignar");
        return;
      }
      setReasignarSuccess(data.message || "Auditoría reasignada");
      cerrarReasignar();
      load();
    } catch {
      setReasignarError("Error de conexión al reasignar");
    } finally {
      setReasignarSaving(false);
    }
  };

  const puedeReasignar = (r) =>
    isAdmin &&
    Number(r.respondidas || 0) === 0 &&
    r.estado !== "completada" &&
    r.estado !== "cancelada";

  if (selectedId) {
    const aud = detalle?.auditoria;
    const preguntas = detalle?.preguntas || [];

    return (
      <DashboardShell selectedItemId="seguimiento-auditorias">
        <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", width: "100%" }}>
          <Button
            size="small"
            startIcon={<ArrowBack />}
            onClick={cerrarDetalle}
            sx={{ mb: 1.5, textTransform: "none", color: BRAND.muted }}
          >
            Volver al listado
          </Button>

          {error && (
            <Alert severity="error" sx={{ mb: 1.5 }}>
              {error}
            </Alert>
          )}

          {loadingDetalle || !aud ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress sx={{ color: BRAND.primary }} />
            </Box>
          ) : (
            <>
              <Paper
                sx={{
                  px: 2,
                  py: 1.5,
                  mb: 2,
                  borderRadius: 1,
                  border: `1px solid ${BRAND.border}`,
                }}
              >
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                  <Typography sx={{ fontWeight: 800, color: BRAND.ink, flex: 1 }}>
                    Detalle de auditoría
                  </Typography>
                  {chipEstado(aud.estado)}
                </Box>
                <Typography variant="body2" sx={{ color: BRAND.muted, mt: 0.5 }}>
                  {aud.area_nombre} · {aud.sub_area_nombre} · Turno {aud.turno} ·{" "}
                  {aud.tipo_nombre} · {aud.periodo_mes}
                </Typography>
                <Typography variant="body2" sx={{ color: BRAND.ink, mt: 0.5, fontWeight: 600 }}>
                  Auditor: {aud.emp_nombre} ({aud.emp_id})
                </Typography>
                <Typography variant="caption" sx={{ color: BRAND.muted }}>
                  {preguntas.filter((p) => p.respuesta?.cumple).length} de {preguntas.length}{" "}
                  preguntas respondidas
                  {detalle?.porcentaje != null
                    ? ` · Cumplimiento ${detalle.porcentaje}% (${detalle.respuestas_si || 0} Sí)`
                    : ""}
                </Typography>
                {detalle?.porcentaje != null && (
                  <Chip
                    size="small"
                    label={`${detalle.porcentaje}%`}
                    sx={{ mt: 1, fontWeight: 800, bgcolor: BRAND.primary, color: "#fff" }}
                  />
                )}
                {aud.comentario ? (
                  <Typography
                    variant="body2"
                    sx={{ mt: 1.5, color: BRAND.ink, whiteSpace: "pre-wrap" }}
                  >
                    <strong>Comentario:</strong> {aud.comentario}
                  </Typography>
                ) : null}
              </Paper>

              <Paper sx={tablePaperSx}>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={tableHeadRowSx}>
                        <TableCell sx={{ ...tableHeadCellSx, width: 36 }}>#</TableCell>
                        <TableCell sx={tableHeadCellSx}>Pregunta</TableCell>
                        <TableCell sx={{ ...tableHeadCellSx, width: 110 }}>Tipo NC</TableCell>
                        <TableCell sx={{ ...tableHeadCellSx, width: 70 }}>Cumple</TableCell>
                        <TableCell sx={tableHeadCellSx}>Hallazgo</TableCell>
                        <TableCell sx={{ ...tableHeadCellSx, width: 140 }}>Acción</TableCell>
                        <TableCell sx={{ ...tableHeadCellSx, width: 160 }}>Responsable</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {preguntas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={tableEmptyCellSx}>
                            No hay preguntas para esta área / sub área / tipo
                          </TableCell>
                        </TableRow>
                      ) : (
                        preguntas.map((p, idx) => {
                          const r = p.respuesta;
                          const cumple = r?.cumple;
                          return (
                            <TableRow key={p.id_pregunta} hover>
                              <TableCell sx={{ color: BRAND.muted }}>{idx + 1}</TableCell>
                              <TableCell sx={{ fontSize: "0.82rem" }}>{p.texto}</TableCell>
                              <TableCell sx={{ fontSize: "0.75rem", color: BRAND.muted }}>
                                {cumple === "no" ? r?.tipo_nc_nombre || "—" : "—"}
                              </TableCell>
                              <TableCell>
                                {cumple ? (
                                  <Chip
                                    size="small"
                                    label={cumple === "si" ? "Sí" : "No"}
                                    sx={{
                                      bgcolor: cumple === "si" ? "#2E7D32" : "#C62828",
                                      color: "#fff",
                                      fontWeight: 700,
                                      height: 22,
                                    }}
                                  />
                                ) : (
                                  <Typography variant="caption" sx={{ color: BRAND.muted }}>
                                    Sin resp.
                                  </Typography>
                                )}
                              </TableCell>
                              <TableCell sx={{ fontSize: "0.78rem", maxWidth: 220 }}>
                                {cumple === "no" ? r?.hallazgo || "—" : "—"}
                              </TableCell>
                              <TableCell sx={{ fontSize: "0.78rem" }}>
                                {cumple === "no" ? r?.accion_nombre || "—" : "—"}
                              </TableCell>
                              <TableCell sx={{ fontSize: "0.78rem" }}>
                                {cumple === "no"
                                  ? r?.emp_nombre_responsable || r?.emp_id_responsable || "—"
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}
        </Box>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell selectedItemId="seguimiento-auditorias">
      <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", width: "100%" }}>
        <Typography variant="h5" sx={pageTitleSx}>
          Seguimiento de auditorías
        </Typography>
        <Typography variant="body2" sx={pageSubtitleSx}>
          Ve todas las auditorías del mes: área, sub área, preguntas, a quién se
          asignó, si ya se respondió y el detalle de cada respuesta.
        </Typography>

        <Paper
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 1,
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
          <TextField
            select
            label="Filtrar área"
            value={filtroArea}
            onChange={(e) => setFiltroArea(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {areas.map((a) => (
              <MenuItem key={a.id_area} value={String(a.id_area)}>
                {a.nombre}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Filtrar sub área"
            value={filtroSubArea}
            onChange={(e) => setFiltroSubArea(e.target.value)}
            size="small"
            disabled={!filtroArea}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {subAreas.map((sa) => (
              <MenuItem key={sa.id_sub_area} value={String(sa.id_sub_area)}>
                {sa.nombre}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Filtrar auditor"
            placeholder="Nombre o emp_id"
            value={filtroAuditor}
            onChange={(e) => setFiltroAuditor(e.target.value)}
            size="small"
            sx={{ minWidth: 220 }}
          />
          <Button
            variant="outlined"
            startIcon={<FilterAltOff />}
            disabled={!filtrosActivos}
            onClick={() => {
              setAnio(actual.anio);
              setMes("");
              setFiltroArea("");
              setFiltroSubArea("");
              setFiltroAuditor("");
            }}
            sx={{ textTransform: "none" }}
          >
            Limpiar filtros
          </Button>
          <Typography variant="caption" sx={{ color: BRAND.muted, ml: "auto" }}>
            {labelPeriodo(anio, mes)} · {filtradas.length} auditorías
          </Typography>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {reasignarSuccess && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setReasignarSuccess("")}>
            {reasignarSuccess}
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
                    <TableCell sx={tableHeadCellSx}>Área</TableCell>
                    <TableCell sx={tableHeadCellSx}>Sub área</TableCell>
                    <TableCell sx={tableHeadCellSx}>Turno</TableCell>
                    <TableCell sx={tableHeadCellSx}>Tipo</TableCell>
                    <TableCell sx={tableHeadCellSx}>Auditor</TableCell>
                    <TableCell sx={tableHeadCellSx}>Vence</TableCell>
                    <TableCell sx={tableHeadCellSx}>Estado</TableCell>
                    <TableCell sx={tableHeadCellSx}>Avance</TableCell>
                    <TableCell sx={tableHeadCellSx}>%</TableCell>
                    <TableCell sx={tableHeadCellSx} align="right">
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={tableEmptyCellSx}>
                        No hay auditorías para {labelPeriodo(anio, mes)}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtradas.map((r) => {
                      const vencida = esAuditoriaVencida(r);
                      const total = r.total_preguntas || 0;
                      const resp = r.respondidas || 0;
                      const avance =
                        total === 0
                          ? "Sin preguntas"
                          : resp === 0
                            ? "Sin responder"
                            : resp >= total
                              ? "Respondida"
                              : `${resp}/${total}`;
                      return (
                        <TableRow
                          key={r.id_auditoria}
                          hover
                          sx={{
                            bgcolor: vencida ? "rgba(198, 40, 40, 0.08)" : undefined,
                            "& td": vencida ? { color: COLOR_VENCIDA } : undefined,
                          }}
                        >
                          <TableCell>{r.area_nombre}</TableCell>
                          <TableCell>{r.sub_area_nombre}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={`Turno ${r.turno || "—"}`}
                              sx={{
                                fontWeight: 700,
                                bgcolor: vencida ? "rgba(198, 40, 40, 0.12)" : BRAND.soft,
                                color: vencida ? COLOR_VENCIDA : BRAND.primaryDark,
                              }}
                            />
                          </TableCell>
                          <TableCell>{r.tipo_nombre}</TableCell>
                          <TableCell>
                            <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                              {r.emp_nombre}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ color: vencida ? COLOR_VENCIDA : BRAND.muted }}
                            >
                              {r.emp_id}
                            </Typography>
                          </TableCell>
                          <TableCell>{r.fecha_programada || "—"}</TableCell>
                          <TableCell>{chipEstado(r.estado)}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={avance}
                              variant="outlined"
                              sx={{
                                fontWeight: 600,
                                borderColor:
                                  avance === "Respondida"
                                    ? "#2E7D32"
                                    : avance === "Sin responder"
                                      ? BRAND.muted
                                      : BRAND.primary,
                                color:
                                  avance === "Respondida"
                                    ? "#2E7D32"
                                    : avance === "Sin responder"
                                      ? BRAND.muted
                                      : BRAND.primary,
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, color: BRAND.primaryDark }}>
                            {r.estado === "completada" && r.porcentaje != null
                              ? `${r.porcentaje}%`
                              : "—"}
                          </TableCell>
                          <TableCell align="right">
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: 0.5,
                                flexWrap: "wrap",
                              }}
                            >
                              <Button
                                size="small"
                                startIcon={<Visibility />}
                                onClick={() => abrirDetalle(r.id_auditoria)}
                                sx={{
                                  textTransform: "none",
                                  color: BRAND.primary,
                                  fontWeight: 700,
                                }}
                              >
                                Ver
                              </Button>
                              {isAdmin &&
                                r.estado !== "completada" &&
                                r.estado !== "cancelada" && (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    startIcon={<EditNote />}
                                    onClick={() =>
                                      router.push(
                                        `/dashboard/auditorias/${r.id_auditoria}?admin=1&desde=seguimiento`,
                                      )
                                    }
                                    sx={{
                                      textTransform: "none",
                                      fontWeight: 700,
                                      bgcolor: BRAND.primary,
                                    }}
                                  >
                                    Auditar
                                  </Button>
                                )}
                              {puedeReasignar(r) && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<SwapHoriz />}
                                  onClick={() => abrirReasignar(r)}
                                  sx={{
                                    textTransform: "none",
                                    fontWeight: 700,
                                    borderColor: BRAND.primary,
                                    color: BRAND.primary,
                                  }}
                                >
                                  Reasignar
                                </Button>
                              )}
                            </Box>
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

        <Dialog open={Boolean(reasignarRow)} onClose={cerrarReasignar} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, color: BRAND.ink }}>
            Reasignar auditoría
          </DialogTitle>
          <DialogContent>
            {reasignarRow && (
              <>
                <Typography variant="body2" sx={{ color: BRAND.muted, mb: 2 }}>
                  Auditor: <strong>{reasignarRow.emp_nombre}</strong> ({reasignarRow.emp_id})
                  · Periodo {reasignarRow.periodo_mes}
                </Typography>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  La asignación actual se <strong>eliminará</strong> de la base de datos y dejará
                  de contar en porcentajes y gráficas del mes. Solo permitido si no hay respuestas
                  guardadas.
                </Alert>
                <Typography variant="caption" sx={{ color: BRAND.muted, display: "block", mb: 1.5 }}>
                  Actual: {reasignarRow.area_nombre} · {reasignarRow.sub_area_nombre} · Turno{" "}
                  {reasignarRow.turno} · {reasignarRow.tipo_nombre}
                </Typography>
                {reasignarError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {reasignarError}
                  </Alert>
                )}
                <Box sx={{ display: "grid", gap: 1.5 }}>
                  <TextField
                    select
                    size="small"
                    label="Nueva área"
                    value={reasignarForm.id_area}
                    onChange={(e) =>
                      setReasignarForm({
                        id_area: e.target.value,
                        id_sub_area: "",
                        id_tipo_auditoria: "",
                        turno: "",
                      })
                    }
                  >
                    {areas.map((a) => (
                      <MenuItem key={a.id_area} value={String(a.id_area)}>
                        {a.nombre}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="Nueva sub área"
                    value={reasignarForm.id_sub_area}
                    disabled={!reasignarForm.id_area}
                    onChange={(e) =>
                      setReasignarForm((prev) => ({
                        ...prev,
                        id_sub_area: e.target.value,
                        id_tipo_auditoria: "",
                        turno: "",
                      }))
                    }
                  >
                    {reasignarSubAreas.map((sa) => (
                      <MenuItem key={sa.id_sub_area} value={String(sa.id_sub_area)}>
                        {sa.nombre}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="Tipo de auditoría"
                    value={reasignarForm.id_tipo_auditoria}
                    disabled={!reasignarForm.id_sub_area}
                    onChange={(e) =>
                      setReasignarForm((prev) => ({
                        ...prev,
                        id_tipo_auditoria: e.target.value,
                      }))
                    }
                  >
                    {reasignarTipos.length === 0 ? (
                      <MenuItem disabled value="">
                        Sin tipos con preguntas para esta sub área
                      </MenuItem>
                    ) : (
                      reasignarTipos.map((t) => (
                        <MenuItem key={t.id_tipo_auditoria} value={String(t.id_tipo_auditoria)}>
                          {t.nombre}
                        </MenuItem>
                      ))
                    )}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="Turno"
                    value={reasignarForm.turno}
                    disabled={!reasignarForm.id_sub_area}
                    onChange={(e) =>
                      setReasignarForm((prev) => ({ ...prev, turno: e.target.value }))
                    }
                  >
                    {reasignarTurnos.length === 0 ? (
                      <MenuItem disabled value="">
                        Sin turnos configurados en la sub área
                      </MenuItem>
                    ) : (
                      reasignarTurnos.map((t) => (
                        <MenuItem key={t.id_turno} value={t.codigo}>
                          {t.label || t.codigo}
                        </MenuItem>
                      ))
                    )}
                  </TextField>
                </Box>
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={cerrarReasignar} sx={{ textTransform: "none" }}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              disabled={reasignarSaving}
              onClick={guardarReasignacion}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                bgcolor: BRAND.primary,
              }}
            >
              {reasignarSaving ? "Guardando..." : "Reasignar y eliminar anterior"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardShell>
  );
}

export default SeguimientoAuditorias;
