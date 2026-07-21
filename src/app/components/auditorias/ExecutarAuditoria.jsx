"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { ArrowBack, Save } from "@mui/icons-material";
import DashboardShell from "@/app/components/DashboardShell";
import { isAdminClient } from "@/libs/dashboard_access";
import { BRAND } from "@/libs/theme_palette";
import { COLOR_VENCIDA, colorEstadoAuditoria, esAuditoriaVencida } from "@/libs/auditoria_fechas";
import {
  PAGE_MAX_WIDTH,
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

function emptyRespuesta(pregunta) {
  const prev = pregunta?.respuesta;
  const idTipoNc =
    prev?.id_tipo_nc ||
    (prev?.cumple === "no" ? pregunta.id_tipo_nc : null) ||
    "";
  return {
    id_pregunta: pregunta.id_pregunta,
    cumple: prev?.cumple || "",
    hallazgo: prev?.hallazgo || "",
    id_tipo_nc: idTipoNc ? String(idTipoNc) : "",
    id_accion: prev?.id_accion ? String(prev.id_accion) : "",
    emp_id_responsable: prev?.emp_id_responsable || "",
    emp_nombre_responsable: prev?.emp_nombre_responsable || "",
  };
}

function ExecutarAuditoria({ idAuditoria }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const adminMode = useMemo(
    () =>
      searchParams.get("admin") === "1" &&
      isAdminClient(),
    [searchParams],
  );
  const volverRuta =
    searchParams.get("desde") === "seguimiento"
      ? "/dashboard/auditorias/seguimiento"
      : "/dashboard/auditorias";
  const shellItemId =
    searchParams.get("desde") === "seguimiento"
      ? "seguimiento-auditorias"
      : "mis-auditorias";
  const [auditoria, setAuditoria] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [acciones, setAcciones] = useState([]);
  const [tiposNc, setTiposNc] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [horario, setHorario] = useState({
    permitido: true,
    motivo: null,
    descripcion: "",
  });
  const [porcentaje, setPorcentaje] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const audUrl = adminMode
        ? `/api/auditorias/${idAuditoria}?is_admin=true`
        : `/api/auditorias/${idAuditoria}`;
      const [audRes, accRes, ncRes, empRes] = await Promise.all([
        fetch(audUrl),
        fetch("/api/acciones"),
        fetch("/api/tipos-no-conformidad"),
        fetch("/api/empleados/administrativos"),
      ]);
      const audData = await audRes.json();
      const accData = await accRes.json();
      const ncData = await ncRes.json();
      const empData = await empRes.json();

      if (!audRes.ok) {
        setError(audData.error || "No se pudo cargar la auditoría");
        return;
      }

      setAuditoria(audData.data.auditoria);
      setPorcentaje(
        audData.data.porcentaje != null ? audData.data.porcentaje : null,
      );
      setHorario(
        audData.data.horario || {
          permitido: true,
          motivo: null,
          descripcion: "",
        },
      );
      const list = audData.data.preguntas || [];
      setPreguntas(list);
      setRespuestas(
        Object.fromEntries(list.map((p) => [p.id_pregunta, emptyRespuesta(p)])),
      );
      setAcciones(accData.success ? accData.data || [] : []);
      setTiposNc(ncData.success ? ncData.data || [] : []);
      setResponsables(empData.success ? empData.data || [] : []);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [idAuditoria, adminMode]);

  useEffect(() => {
    load();
  }, [load]);

  const updateRespuesta = (idPregunta, field, value) => {
    setRespuestas((prev) => ({
      ...prev,
      [idPregunta]: { ...prev[idPregunta], [field]: value },
    }));
  };

  const handleResponsable = (idPregunta, empId) => {
    const emp = responsables.find((e) => String(e.emp_id) === String(empId));
    setRespuestas((prev) => ({
      ...prev,
      [idPregunta]: {
        ...prev[idPregunta],
        emp_id_responsable: empId,
        emp_nombre_responsable: emp?.nombre_completo || "",
      },
    }));
  };

  const handleGuardar = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (!adminMode && !horario.permitido) {
        setError(horario.motivo || "Fuera de horario de turno");
        return;
      }
      const empId = adminMode
        ? String(auditoria?.emp_id ?? "").trim()
        : getMiEmpId();
      if (!empId) {
        setError("No se pudo identificar al auditor asignado");
        return;
      }
      const payload = Object.values(respuestas).filter((r) => r.cumple === "si" || r.cumple === "no");

      if (!payload.length) {
        setError("Responda al menos una pregunta (Sí o No)");
        return;
      }

      const res = await fetch(`/api/auditorias/${idAuditoria}/respuestas`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emp_id: empId,
          is_admin: adminMode,
          respuestas: payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al guardar");
        return;
      }
      setSuccess(data.message || "Guardado");
      if (data.data?.estado === "completada") {
        setAuditoria((a) => (a ? { ...a, estado: "completada" } : a));
      } else if (data.data?.estado) {
        setAuditoria((a) =>
          a ? { ...a, estado: data.data.estado } : a,
        );
      }
      load();
    } catch {
      setError("Error de conexión al guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardShell selectedItemId={shellItemId}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress sx={{ color: BRAND.primary }} />
        </Box>
      </DashboardShell>
    );
  }

  if (!auditoria) {
    return (
      <DashboardShell selectedItemId={shellItemId}>
        <Alert severity="error">{error || "Auditoría no encontrada"}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => router.push(volverRuta)} sx={{ mt: 2 }}>
          Volver
        </Button>
      </DashboardShell>
    );
  }

  const cerrada = auditoria.estado === "completada" || auditoria.estado === "cancelada";
  const vencida = esAuditoriaVencida(auditoria);
  const fueraHorario = !adminMode && !cerrada && !horario.permitido;
  const soloLectura = cerrada || fueraHorario;

  return (
    <DashboardShell selectedItemId={shellItemId}>
      <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", width: "100%" }}>
        <Button
          size="small"
          startIcon={<ArrowBack />}
          onClick={() => router.push(volverRuta)}
          sx={{ mb: 1.5, textTransform: "none", color: BRAND.muted }}
        >
          {adminMode ? "Seguimiento" : "Mis auditorías"}
        </Button>

        {adminMode && !cerrada && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            Modo administrador: está auditando en nombre de{" "}
            <strong>
              {auditoria.emp_nombre} ({auditoria.emp_id})
            </strong>
            . Sin restricción de turno.
          </Alert>
        )}

        <Paper
          sx={{
            px: 2,
            py: 1.5,
            mb: 2,
            borderRadius: 1,
            border: `1px solid ${BRAND.border}`,
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            alignItems: "center",
          }}
        >
          <Typography sx={{ fontWeight: 800, color: BRAND.ink, fontSize: "1.1rem", flex: 1 }}>
            Ejecutar auditoría
          </Typography>
          <Chip
            size="small"
            label={auditoria.estado}
            sx={{
              bgcolor: colorEstadoAuditoria(auditoria.estado),
              color: "#fff",
              fontWeight: 600,
              textTransform: "capitalize",
            }}
          />
          {vencida && auditoria.estado !== "vencida" && (
            <Chip
              size="small"
              label="Vencida"
              sx={{
                bgcolor: COLOR_VENCIDA,
                color: "#fff",
                fontWeight: 800,
              }}
            />
          )}
          {auditoria.estado === "completada" && porcentaje != null && (
            <Chip
              size="small"
              label={`${porcentaje}% cumplimiento`}
              sx={{
                bgcolor: BRAND.primary,
                color: "#fff",
                fontWeight: 800,
              }}
            />
          )}
          <Typography
            variant="caption"
            sx={{
              color: vencida ? COLOR_VENCIDA : BRAND.muted,
              width: "100%",
              fontWeight: vencida ? 700 : 400,
            }}
          >
            {auditoria.area_nombre} · {auditoria.sub_area_nombre} · Turno {auditoria.turno} ·{" "}
            {auditoria.tipo_nombre} · Vence {auditoria.fecha_programada} ·{" "}
            {preguntas.length} preguntas
            {auditoria.estado === "completada" && porcentaje != null
              ? ` · Cada Sí suma igual; resultado ${porcentaje}%`
              : ""}
          </Typography>
          {horario.descripcion && (
            <Typography variant="caption" sx={{ color: BRAND.primaryDark, width: "100%", fontWeight: 600 }}>
              {horario.descripcion}
            </Typography>
          )}
        </Paper>

        {vencida && !cerrada && (
          <Alert
            severity="error"
            sx={{
              mb: 1.5,
              bgcolor: "rgba(198, 40, 40, 0.08)",
              color: COLOR_VENCIDA,
              "& .MuiAlert-icon": { color: COLOR_VENCIDA },
            }}
          >
            Vencida — aún se puede auditar.
          </Alert>
        )}

        {fueraHorario && (
          <Alert severity="warning" sx={{ mb: 1.5 }}>
            {horario.motivo || "No puede auditar fuera del horario de su turno."} Puede ver la
            auditoría, pero no guardar respuestas hasta el horario permitido (hora de México).
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 1.5, py: 0 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 1.5, py: 0 }}>
            {success}
          </Alert>
        )}

        {preguntas.length === 0 ? (
          <Alert severity="warning">
            No hay preguntas configuradas para esta área, sub área y tipo de auditoría.
          </Alert>
        ) : (
          <Paper sx={tablePaperSx}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={tableHeadRowSx}>
                    <TableCell sx={{ ...tableHeadCellSx, width: 36 }}>#</TableCell>
                    <TableCell sx={tableHeadCellSx}>Pregunta</TableCell>
                    <TableCell sx={{ ...tableHeadCellSx, width: 96, textAlign: "center" }}>
                      Cumple
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preguntas.map((p, idx) => {
                    const r = respuestas[p.id_pregunta] || emptyRespuesta(p);
                    const esNo = r.cumple === "no";
                    return (
                      <React.Fragment key={p.id_pregunta}>
                        <TableRow
                          hover
                          sx={{
                            "& td": { py: 0.75, verticalAlign: "top" },
                            bgcolor: esNo ? BRAND.hover : "inherit",
                          }}
                        >
                          <TableCell sx={{ color: BRAND.muted, fontWeight: 600 }}>{idx + 1}</TableCell>
                          <TableCell sx={{ fontSize: "0.82rem", lineHeight: 1.35 }}>
                            {p.texto}
                          </TableCell>
                          <TableCell align="center">
                            <ToggleButtonGroup
                              exclusive
                              size="small"
                              value={r.cumple}
                              onChange={(_, val) => {
                                if (!val) return;
                                setRespuestas((prev) => ({
                                  ...prev,
                                  [p.id_pregunta]: {
                                    ...prev[p.id_pregunta],
                                    cumple: val,
                                    ...(val === "si"
                                      ? {
                                          hallazgo: "",
                                          id_tipo_nc: "",
                                          id_accion: "",
                                          emp_id_responsable: "",
                                          emp_nombre_responsable: "",
                                        }
                                      : {
                                          id_tipo_nc:
                                            prev[p.id_pregunta]?.id_tipo_nc ||
                                            String(p.id_tipo_nc || ""),
                                        }),
                                  },
                                }));
                              }}
                              disabled={soloLectura}
                            >
                              <ToggleButton
                                value="si"
                                sx={{ px: 1.25, py: 0.25, fontSize: "0.75rem", fontWeight: 700 }}
                              >
                                Sí
                              </ToggleButton>
                              <ToggleButton
                                value="no"
                                sx={{ px: 1.25, py: 0.25, fontSize: "0.75rem", fontWeight: 700 }}
                              >
                                No
                              </ToggleButton>
                            </ToggleButtonGroup>
                          </TableCell>
                        </TableRow>
                        {esNo && (
                          <TableRow sx={{ bgcolor: BRAND.hover }}>
                            <TableCell colSpan={3} sx={{ py: 1, borderBottom: `1px solid ${BRAND.border}` }}>
                              <Box
                                sx={{
                                  display: "grid",
                                  gridTemplateColumns: {
                                    xs: "1fr",
                                    sm: "1.2fr 1fr 1fr 1fr",
                                  },
                                  gap: 1,
                                }}
                              >
                                <TextField
                                  size="small"
                                  fullWidth
                                  multiline
                                  maxRows={3}
                                  label="Hallazgo"
                                  value={r.hallazgo}
                                  onChange={(e) =>
                                    updateRespuesta(p.id_pregunta, "hallazgo", e.target.value)
                                  }
                                  disabled={soloLectura}
                                />
                                <TextField
                                  size="small"
                                  select
                                  fullWidth
                                  label="Tipo NC"
                                  value={r.id_tipo_nc}
                                  onChange={(e) =>
                                    updateRespuesta(p.id_pregunta, "id_tipo_nc", e.target.value)
                                  }
                                  disabled={soloLectura}
                                >
                                  {tiposNc.map((t) => (
                                    <MenuItem key={t.id_tipo_nc} value={String(t.id_tipo_nc)}>
                                      {t.nombre}
                                    </MenuItem>
                                  ))}
                                </TextField>
                                <TextField
                                  size="small"
                                  select
                                  fullWidth
                                  label="Acción"
                                  value={r.id_accion}
                                  onChange={(e) =>
                                    updateRespuesta(p.id_pregunta, "id_accion", e.target.value)
                                  }
                                  disabled={soloLectura}
                                >
                                  {acciones.map((a) => (
                                    <MenuItem key={a.id_accion} value={String(a.id_accion)}>
                                      {a.nombre}
                                    </MenuItem>
                                  ))}
                                </TextField>
                                <TextField
                                  size="small"
                                  select
                                  fullWidth
                                  label="Responsable"
                                  value={r.emp_id_responsable}
                                  onChange={(e) => handleResponsable(p.id_pregunta, e.target.value)}
                                  disabled={soloLectura}
                                >
                                  {responsables.map((e) => (
                                    <MenuItem key={e.emp_id} value={String(e.emp_id)}>
                                      {e.nombre_completo}
                                    </MenuItem>
                                  ))}
                                </TextField>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {preguntas.length > 0 && !cerrada && (
          <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              size="medium"
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
              disabled={saving || fueraHorario}
              onClick={handleGuardar}
              sx={{
                bgcolor: BRAND.primary,
                "&:hover": { bgcolor: BRAND.primaryDark },
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              {saving ? "Guardando..." : "Guardar auditoría"}
            </Button>
          </Box>
        )}
      </Box>
    </DashboardShell>
  );
}

export default ExecutarAuditoria;
