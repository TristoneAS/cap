"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Autocomplete,
} from "@mui/material";
import { Add, Check, Delete, Edit } from "@mui/icons-material";
import DashboardShell from "@/app/components/DashboardShell";
import { BRAND } from "@/libs/theme_palette";
import {
  PAGE_MAX_WIDTH,
  pageSubtitleSx,
  pageTitleSx,
  tableEmptyCellSx,
  tableHeadCellSx,
  tableHeadRowSx,
  tablePaperSx,
  tableToolbarSx,
} from "@/libs/table_ui";

function parentAreaIds(form, multiArea) {
  if (multiArea) {
    return (form.id_areas || []).map(String).filter(Boolean);
  }
  return form.id_area ? [String(form.id_area)] : [];
}

function selectedSubIdsFromForm(form) {
  const ids = (form.id_sub_areas || []).map(String).filter(Boolean);
  if (form.id_sub_area) {
    const single = String(form.id_sub_area);
    if (!ids.includes(single)) ids.push(single);
  }
  return ids;
}

function lookupSubArea(subAreasList, subAreasById, subId) {
  const key = String(subId);
  if (subAreasById.has(key)) return subAreasById.get(key);
  return subAreasList.find((s) => String(s.id_sub_area) === key);
}

function resolveSubOption(id, subAreaOptions, subAreasById) {
  const key = String(id);
  return (
    subAreaOptions.find((s) => String(s.id_sub_area) === key) ||
    subAreasById.get(key) || {
      id_sub_area: id,
      nombre: `Sub área ${id}`,
      area_nombre: "",
    }
  );
}
function filterSubAreasByRemovedAreas(
  subAreaIds,
  subAreasList,
  subAreasById,
  removedAreaIds,
) {
  if (!removedAreaIds.size) return subAreaIds;
  return subAreaIds.filter((subId) => {
    const sub = lookupSubArea(subAreasList, subAreasById, subId);
    if (!sub) return true;
    return !removedAreaIds.has(String(sub.id_area));
  });
}

const emptyForm = {
  id_tipo_auditoria: "",
  id_tipo_nc: "",
  texto: "",
  id_area: "",
  id_areas: [],
  id_sub_area: "",
  id_sub_areas: [],
};

export default function PreguntasCatalog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroSubArea, setFiltroSubArea] = useState("");
  const [multiArea, setMultiArea] = useState(false);
  const [multiSubArea, setMultiSubArea] = useState(false);
  const [areas, setAreas] = useState([]);
  const [subAreas, setSubAreas] = useState([]);
  const [subAreasById, setSubAreasById] = useState(() => new Map());
  const subAreasByIdRef = useRef(subAreasById);
  subAreasByIdRef.current = subAreasById;
  const [tiposAuditoria, setTiposAuditoria] = useState([]);
  const [tiposNc, setTiposNc] = useState([]);

  const loadCatalogos = useCallback(async () => {
    const [a, t, nc] = await Promise.all([
      fetch("/api/areas").then((r) => r.json()),
      fetch("/api/tipos-auditoria").then((r) => r.json()),
      fetch("/api/tipos-no-conformidad").then((r) => r.json()),
    ]);
    setAreas(a.success ? a.data || [] : []);
    setTiposAuditoria(t.success ? t.data || [] : []);
    setTiposNc(nc.success ? nc.data || [] : []);
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filtroArea) params.set("id_area", filtroArea);
      if (filtroSubArea) params.set("id_sub_area", filtroSubArea);
      const qs = params.toString();
      const res = await fetch(`/api/preguntas${qs ? `?${qs}` : ""}`);
      const data = await res.json();
      if (!res.ok) {
        setRows([]);
        setError(data.error || "Error al cargar preguntas");
        return;
      }
      setRows(data.data || []);
    } catch {
      setRows([]);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [filtroArea, filtroSubArea]);

  useEffect(() => {
    loadCatalogos();
  }, [loadCatalogos]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const areaIds = parentAreaIds(form, multiArea);
  const useMultiSub =
    multiSubArea || (multiArea && areaIds.length > 1);

  useEffect(() => {
    if (!areaIds.length) {
      setSubAreas([]);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      const merged = [];
      for (const areaId of areaIds) {
        const res = await fetch(
          `/api/sub-areas?id_area=${encodeURIComponent(areaId)}`,
        );
        const data = await res.json();
        if (res.ok && data.success) merged.push(...(data.data || []));
      }
      if (cancelled) return;

      merged.sort((a, b) =>
        String(a.nombre).localeCompare(String(b.nombre), "es"),
      );
      setSubAreas(merged);
      setSubAreasById((prev) => {
        const next = new Map(prev);
        for (const sub of merged) {
          next.set(String(sub.id_sub_area), sub);
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [areaIds.join(",")]);

  useEffect(() => {
    if (multiArea && areaIds.length > 1) {
      setMultiSubArea(true);
    }
  }, [multiArea, areaIds.length]);

  const [subAreasFiltro, setSubAreasFiltro] = useState([]);

  useEffect(() => {
    if (!filtroArea) {
      setSubAreasFiltro([]);
      return undefined;
    }
    let cancelled = false;
    fetch(`/api/sub-areas?id_area=${encodeURIComponent(filtroArea)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setSubAreasFiltro(data.success ? data.data || [] : []);
      })
      .catch(() => {
        if (!cancelled) setSubAreasFiltro([]);
      });
    return () => {
      cancelled = true;
    };
  }, [filtroArea]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
    setSelected(null);
    setMultiArea(false);
    setMultiSubArea(false);
    setSubAreas([]);
    setSubAreasById(new Map());
  };

  const handleEdit = async () => {
    if (!selected) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/preguntas/${selected.id_pregunta}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al cargar pregunta");
        return;
      }
      const item = data.data;
      const alcance = item.alcance || [];
      const uniqueAreas = [...new Set(alcance.map((a) => String(a.id_area)))];
      const subIds = alcance.map((a) => String(a.id_sub_area));

      setEditId(item.id_pregunta);
      setMultiArea(uniqueAreas.length > 1);
      setMultiSubArea(uniqueAreas.length > 1 || subIds.length > 1);
      setForm({
        id_tipo_auditoria: String(item.id_tipo_auditoria),
        id_tipo_nc: String(item.id_tipo_nc),
        texto: item.texto || "",
        id_area: uniqueAreas.length === 1 ? uniqueAreas[0] : "",
        id_areas: uniqueAreas,
        id_sub_area: subIds.length === 1 ? subIds[0] : "",
        id_sub_areas: subIds,
      });
    } catch {
      setError("Error de conexión al cargar pregunta");
    }
  };

  const buildPayload = () => {
    const payload = {
      id_tipo_auditoria: Number(form.id_tipo_auditoria),
      id_tipo_nc: Number(form.id_tipo_nc),
      texto: String(form.texto || "").trim(),
    };

    if (multiArea) {
      payload.id_areas = (form.id_areas || []).map(Number).filter(Boolean);
    } else if (form.id_area) {
      payload.id_area = Number(form.id_area);
      payload.id_areas = [Number(form.id_area)];
    }

    if (useMultiSub) {
      payload.id_sub_areas = selectedSubIdsFromForm(form).map(Number).filter(Boolean);
    } else {
      const subIds = selectedSubIdsFromForm(form);
      if (subIds.length === 1) {
        payload.id_sub_area = Number(subIds[0]);
        payload.id_sub_areas = [Number(subIds[0])];
      }
    }

    return payload;
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = buildPayload();
      if (
        !payload.id_tipo_auditoria ||
        !payload.id_tipo_nc ||
        !payload.texto ||
        !payload.id_sub_areas?.length
      ) {
        setError("Complete tipo, pregunta, área/sub área y tipo NC");
        return;
      }

      const url = editId ? `/api/preguntas/${editId}` : "/api/preguntas";
      const res = await fetch(url, {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al guardar");
        return;
      }
      setSuccess(data.message || "Guardado correctamente");
      resetForm();
      loadRows();
    } catch {
      setError("Error de conexión al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`¿Eliminar la pregunta "${selected.texto}"?`)) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/preguntas/${selected.id_pregunta}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al eliminar");
        return;
      }
      setSuccess(data.message || "Pregunta eliminada");
      resetForm();
      loadRows();
    } catch {
      setError("Error de conexión al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  const subAreaOptions = useMemo(() => {
    const map = new Map(subAreas.map((s) => [String(s.id_sub_area), s]));
    for (const id of selectedSubIdsFromForm(form)) {
      const key = String(id);
      if (!map.has(key) && subAreasById.has(key)) {
        map.set(key, subAreasById.get(key));
      }
    }
    return [...map.values()].sort((a, b) =>
      `${a.area_nombre || ""} ${a.nombre}`.localeCompare(
        `${b.area_nombre || ""} ${b.nombre}`,
        "es",
      ),
    );
  }, [subAreas, form.id_sub_areas, form.id_sub_area, subAreasById]);

  const selectedSubMulti = useMemo(
    () =>
      selectedSubIdsFromForm(form).map((id) =>
        resolveSubOption(id, subAreaOptions, subAreasById),
      ),
    [form.id_sub_areas, form.id_sub_area, subAreaOptions, subAreasById],
  );

  const selectedAreaMulti = (form.id_areas || [])
    .map(String)
    .map((id) => areas.find((a) => String(a.id_area) === id))
    .filter(Boolean);

  return (
    <DashboardShell selectedItemId="preguntas">
      <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", width: "100%" }}>
        <Typography variant="h5" sx={pageTitleSx}>
          Preguntas
        </Typography>
        <Typography variant="body2" sx={pageSubtitleSx}>
          Una pregunta se define una sola vez. El <strong>alcance</strong> indica
          en qué sub áreas aplica. Puede elegir solo algunas (ej. calidad 1, no todas).
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Paper sx={{ p: 2, borderRadius: 1, border: `1px solid ${BRAND.border}` }}>
            <Typography sx={{ fontWeight: 700, mb: 1.5, color: BRAND.primary }}>
              {editId ? "Editar pregunta" : "Nueva pregunta"}
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(3, 1fr)" },
                gap: 1.5,
                alignItems: "start",
              }}
            >
              <TextField
                select
                fullWidth
                size="small"
                label="Tipo de auditoría"
                value={form.id_tipo_auditoria}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, id_tipo_auditoria: e.target.value }))
                }
                required
              >
                {tiposAuditoria.map((t) => (
                  <MenuItem key={t.id_tipo_auditoria} value={String(t.id_tipo_auditoria)}>
                    {t.nombre}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                size="small"
                label="Tipo de no conformidad"
                value={form.id_tipo_nc}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, id_tipo_nc: e.target.value }))
                }
                required
              >
                {tiposNc.map((t) => (
                  <MenuItem key={t.id_tipo_nc} value={String(t.id_tipo_nc)}>
                    {t.nombre}
                  </MenuItem>
                ))}
              </TextField>

              <Box sx={{ display: "flex", gap: 1, gridColumn: { xs: "1 / -1", lg: "span 1" } }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {multiArea ? (
                    <Autocomplete
                      multiple
                      size="small"
                      disableCloseOnSelect
                      limitTags={2}
                      options={areas}
                      value={selectedAreaMulti}
                      getOptionLabel={(o) => o.nombre || ""}
                      isOptionEqualToValue={(a, b) =>
                        String(a.id_area) === String(b.id_area)
                      }
                      onChange={(_, value) => {
                        const newAreaIds = value.map((o) => String(o.id_area));
                        setForm((prev) => {
                          const removedAreaIds = new Set(
                            (prev.id_areas || []).filter(
                              (id) => !newAreaIds.includes(String(id)),
                            ),
                          );
                          const keptSubs = filterSubAreasByRemovedAreas(
                            selectedSubIdsFromForm(prev),
                            subAreas,
                            subAreasByIdRef.current,
                            removedAreaIds,
                          );
                          return {
                            ...prev,
                            id_areas: newAreaIds,
                            id_area: "",
                            id_sub_area: "",
                            id_sub_areas: keptSubs,
                          };
                        });
                      }}
                      renderInput={(params) => (
                        <TextField {...params} label="Áreas (alcance)" required />
                      )}
                    />
                  ) : (
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Área (alcance)"
                      value={form.id_area}
                      onChange={(e) => {
                        const newArea = e.target.value;
                        const areaChanged = String(form.id_area) !== String(newArea);
                        setForm((prev) => ({
                          ...prev,
                          id_area: newArea,
                          id_sub_area: areaChanged ? "" : prev.id_sub_area,
                          id_sub_areas: areaChanged ? [] : prev.id_sub_areas,
                        }));
                      }}
                      required
                    >
                      {areas.map((a) => (
                        <MenuItem key={a.id_area} value={String(a.id_area)}>
                          {a.nombre}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </Box>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={multiArea}
                      onChange={(e) => {
                        setMultiArea(e.target.checked);
                        setForm((prev) => ({
                          ...prev,
                          id_area: "",
                          id_areas: [],
                          id_sub_area: "",
                          id_sub_areas: [],
                        }));
                      }}
                    />
                  }
                  label="Varias áreas"
                  sx={{
                    m: 0,
                    mt: 0.65,
                    flexShrink: 0,
                    maxWidth: 118,
                    "& .MuiFormControlLabel-label": {
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: BRAND.primaryDark,
                    },
                  }}
                />
              </Box>

              <Box sx={{ display: "flex", gap: 1, gridColumn: { xs: "1 / -1", lg: "span 2" } }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {useMultiSub ? (
                    <Autocomplete
                      multiple
                      size="small"
                      disableCloseOnSelect
                      disabled={!areaIds.length}
                      limitTags={3}
                      options={subAreaOptions}
                      value={selectedSubMulti}
                      getOptionLabel={(o) =>
                        o.area_nombre ? `${o.area_nombre} · ${o.nombre}` : o.nombre || ""
                      }
                      isOptionEqualToValue={(a, b) =>
                        String(a.id_sub_area) === String(b.id_sub_area)
                      }
                      renderOption={(props, option, { selected }) => {
                        const { key, ...rest } = props;
                        const label = option.area_nombre
                          ? `${option.area_nombre} · ${option.nombre}`
                          : option.nombre || "";
                        return (
                          <Box
                            component="li"
                            key={key}
                            {...rest}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              py: 1,
                              px: 1.5,
                              ...(selected
                                ? {
                                    bgcolor: `${BRAND.soft} !important`,
                                    color: BRAND.primaryDeep,
                                    fontWeight: 700,
                                    borderLeft: `3px solid ${BRAND.primary}`,
                                    "&.Mui-focused": {
                                      bgcolor: `${BRAND.primary} !important`,
                                      color: "#fff",
                                      "& .MuiSvgIcon-root": { color: "#fff" },
                                    },
                                  }
                                : {}),
                            }}
                          >
                            <Box component="span" sx={{ flex: 1 }}>
                              {label}
                            </Box>
                            {selected && (
                              <Check
                                sx={{ fontSize: 18, color: BRAND.primary, flexShrink: 0 }}
                              />
                            )}
                          </Box>
                        );
                      }}
                      onChange={(_, value) => {
                        setSubAreasById((prev) => {
                          const next = new Map(prev);
                          for (const sub of value) {
                            next.set(String(sub.id_sub_area), sub);
                          }
                          return next;
                        });
                        setForm((prev) => ({
                          ...prev,
                          id_sub_areas: value.map((o) => String(o.id_sub_area)),
                          id_sub_area: "",
                        }));
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Sub áreas (alcance)"
                          required
                          helperText={
                            selectedSubMulti.length
                              ? `${selectedSubMulti.length} sub área(s) seleccionada(s)`
                              : "Seleccione las sub áreas donde aplica"
                          }
                        />
                      )}
                    />
                  ) : (
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="Sub área (alcance)"
                      value={form.id_sub_area}
                      onChange={(e) => {
                        const subId = e.target.value;
                        const sub = subAreas.find(
                          (s) => String(s.id_sub_area) === String(subId),
                        );
                        if (sub) {
                          setSubAreasById((prev) => {
                            const next = new Map(prev);
                            next.set(String(sub.id_sub_area), sub);
                            return next;
                          });
                        }
                        setForm((prev) => ({ ...prev, id_sub_area: subId }));
                      }}
                      disabled={!areaIds.length}
                      required
                    >
                      {subAreas.map((s) => (
                        <MenuItem key={s.id_sub_area} value={String(s.id_sub_area)}>
                          {s.nombre}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </Box>
                {!(multiArea && areaIds.length > 1) && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={multiSubArea}
                        disabled={!areaIds.length}
                        onChange={(e) => {
                          setMultiSubArea(e.target.checked);
                          setForm((prev) => ({
                            ...prev,
                            id_sub_area: "",
                            id_sub_areas: [],
                          }));
                        }}
                      />
                    }
                    label="Varias sub áreas"
                    sx={{
                      m: 0,
                      mt: 0.65,
                      flexShrink: 0,
                      maxWidth: 130,
                      "& .MuiFormControlLabel-label": {
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: BRAND.primaryDark,
                      },
                    }}
                  />
                )}
              </Box>

              <TextField
                fullWidth
                size="small"
                multiline
                minRows={2}
                label="Pregunta"
                value={form.texto}
                onChange={(e) => setForm((prev) => ({ ...prev, texto: e.target.value }))}
                required
                sx={{ gridColumn: "1 / -1" }}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<Add />}
                disabled={saving}
                onClick={handleSave}
                sx={{
                  bgcolor: BRAND.primary,
                  "&:hover": { bgcolor: BRAND.primaryDark },
                  textTransform: "none",
                  fontWeight: 700,
                }}
              >
                {saving ? "Guardando..." : editId ? "Actualizar" : "Guardar"}
              </Button>
              {(editId || form.texto) && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={resetForm}
                  sx={{ textTransform: "none" }}
                >
                  Cancelar
                </Button>
              )}
            </Box>
          </Paper>

          <Paper sx={tablePaperSx}>
            <Box sx={tableToolbarSx}>
              <Typography sx={{ fontWeight: 700, color: BRAND.ink }}>
                Preguntas activas ({rows.length})
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                <TextField
                  select
                  size="small"
                  label="Filtrar área"
                  value={filtroArea}
                  onChange={(e) => {
                    setFiltroArea(e.target.value);
                    setFiltroSubArea("");
                  }}
                  sx={{ minWidth: 160 }}
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
                  size="small"
                  label="Filtrar sub área"
                  value={filtroSubArea}
                  onChange={(e) => setFiltroSubArea(e.target.value)}
                  disabled={!filtroArea}
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {subAreasFiltro.map((s) => (
                    <MenuItem key={s.id_sub_area} value={String(s.id_sub_area)}>
                      {s.nombre}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Edit />}
                  disabled={!selected}
                  onClick={handleEdit}
                  sx={{ textTransform: "none" }}
                >
                  Editar
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  startIcon={<Delete />}
                  disabled={!selected || deleting}
                  onClick={handleDelete}
                  sx={{ textTransform: "none" }}
                >
                  {deleting ? "..." : "Eliminar"}
                </Button>
              </Box>
            </Box>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                <CircularProgress sx={{ color: BRAND.primary }} />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={tableHeadRowSx}>
                      <TableCell sx={tableHeadCellSx}>Tipo auditoría</TableCell>
                      <TableCell sx={tableHeadCellSx}>Tipo NC</TableCell>
                      <TableCell sx={tableHeadCellSx}>Pregunta</TableCell>
                      <TableCell sx={tableHeadCellSx}>Alcance</TableCell>
                      <TableCell sx={tableHeadCellSx} align="center">
                        Sub áreas
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={tableEmptyCellSx}>
                          Sin preguntas
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((row) => {
                        const sel = selected?.id_pregunta === row.id_pregunta;
                        return (
                          <TableRow
                            key={row.id_pregunta}
                            hover
                            selected={sel}
                            onClick={() => setSelected(sel ? null : row)}
                            sx={{ cursor: "pointer" }}
                          >
                            <TableCell>{row.tipo_nombre}</TableCell>
                            <TableCell>{row.tipo_nc_nombre}</TableCell>
                            <TableCell sx={{ maxWidth: 280 }}>{row.texto}</TableCell>
                            <TableCell sx={{ maxWidth: 360, fontSize: "0.82rem" }}>
                              {row.alcance_resumen}
                            </TableCell>
                            <TableCell align="center">{row.total_sub_areas}</TableCell>
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
      </Box>
    </DashboardShell>
  );
}
