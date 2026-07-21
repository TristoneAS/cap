"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { Add, Delete, Edit } from "@mui/icons-material";
import DashboardShell from "./DashboardShell";
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

function multiKey(field) {
  return field.multiName || `${field.name}_ids`;
}

function normalizeFieldValue(field, raw) {
  if (field.type === "number") {
    if (raw === undefined || raw === null || raw === "") {
      return field.defaultValue ?? 0;
    }
    return Number(raw);
  }
  if (field.type === "select") {
    if (raw === undefined || raw === null || raw === "") return "";
    return String(raw);
  }
  return raw ?? "";
}

function emptyForm(fields) {
  return fields.reduce((acc, f) => {
    acc[f.name] = normalizeFieldValue(f);
    if (f.multiCreate) acc[multiKey(f)] = [];
    return acc;
  }, {});
}

function formFromRow(fields, row) {
  const next = emptyForm(fields);
  fields.forEach((f) => {
    next[f.name] = normalizeFieldValue(f, row?.[f.name]);
    if (f.multiCreate) next[multiKey(f)] = [];
  });
  return next;
}

function CatalogCrud({
  menuItemId,
  title,
  subtitle,
  apiBase,
  idField,
  fields,
  columns,
  tableFilterFields = [],
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(() => emptyForm(fields));
  const [editId, setEditId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectOptions, setSelectOptions] = useState({});
  const [multiEnabled, setMultiEnabled] = useState({});

  const loadSelectOptions = useCallback(async () => {
    const selects = fields.filter(
      (f) => f.type === "select" && f.optionsApi && !f.dependsOn,
    );
    const entries = await Promise.all(
      selects.map(async (f) => {
        const res = await fetch(f.optionsApi);
        const data = await res.json();
        return [f.name, res.ok && data.success ? data.data : []];
      }),
    );
    setSelectOptions((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
  }, [fields]);

  const loadDependentOptions = useCallback(
    async (fieldName, parentValue) => {
      const field = fields.find((f) => f.name === fieldName);
      if (!field?.dependsOn || !parentValue) {
        setSelectOptions((prev) => ({ ...prev, [fieldName]: [] }));
        return;
      }
      const url = `${field.optionsApi}?${field.dependsOn.queryParam}=${encodeURIComponent(parentValue)}`;
      const res = await fetch(url);
      const data = await res.json();
      setSelectOptions((prev) => ({
        ...prev,
        [fieldName]: res.ok && data.success ? data.data : [],
      }));
    },
    [fields],
  );

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(apiBase);
      const data = await res.json();
      if (!res.ok) {
        setRows([]);
        setError(data.error || "Error al cargar datos");
        return;
      }
      setRows(data.data || []);
    } catch {
      setRows([]);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    loadSelectOptions();
    loadRows();
  }, [loadSelectOptions, loadRows]);

  useEffect(() => {
    fields
      .filter((f) => f.dependsOn)
      .forEach((f) => {
        const parentValue = form[f.dependsOn.parentField];
        loadDependentOptions(f.name, parentValue);
      });
  }, [form, fields, loadDependentOptions]);

  const filteredRows = useMemo(() => {
    if (!tableFilterFields.length) return rows;
    return rows.filter((row) =>
      tableFilterFields.every((name) => {
        const v = form[name];
        if (v === undefined || v === null || v === "") return true;
        return String(row[name]) === String(v);
      }),
    );
  }, [rows, form, tableFilterFields]);

  const filtrosActivos = tableFilterFields.some(
    (name) => form[name] !== undefined && form[name] !== null && form[name] !== "",
  );

  useEffect(() => {
    if (!selected) return;
    const stillVisible = filteredRows.some(
      (row) => row[idField] === selected[idField],
    );
    if (!stillVisible) setSelected(null);
  }, [filteredRows, selected, idField]);

  const handleChange = (name, value) => {
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      fields
        .filter((f) => f.dependsOn?.parentField === name)
        .forEach((f) => {
          next[f.name] = "";
          if (f.multiCreate) next[multiKey(f)] = [];
        });
      return next;
    });
  };

  const resetForm = () => {
    setForm(emptyForm(fields));
    setEditId(null);
    setSelected(null);
    setMultiEnabled({});
  };

  const handleEdit = () => {
    if (!selected) return;
    setEditId(selected[idField]);
    setForm(formFromRow(fields, selected));
    setMultiEnabled({});
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = { ...form };
      for (const f of fields) {
        if (f.type === "number") payload[f.name] = Number(payload[f.name] || 0);
        if (f.type === "select") {
          const useMulti = !editId && f.multiCreate && multiEnabled[f.name];
          if (useMulti) {
            const ids = (form[multiKey(f)] || []).map(Number).filter(Boolean);
            if (!ids.length) {
              setError(`Seleccione al menos una ${f.label.toLowerCase()}`);
              return;
            }
            payload[multiKey(f)] = ids;
            delete payload[f.name];
          } else {
            payload[f.name] = Number(payload[f.name]);
            if (f.multiCreate) delete payload[multiKey(f)];
          }
        }
      }

      const url = editId ? `${apiBase}/${editId}` : apiBase;
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
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
    if (!confirm(`¿Eliminar "${selected.nombre || selected.texto || "registro"}"?`)) {
      return;
    }
    setDeleting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${apiBase}/${selected[idField]}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al eliminar");
        return;
      }
      setSuccess(data.message || "Eliminado");
      resetForm();
      loadRows();
    } catch {
      setError("Error de conexión al eliminar");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardShell selectedItemId={menuItemId}>
      <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", width: "100%" }}>
        <Typography variant="h5" sx={pageTitleSx}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={pageSubtitleSx}>
            {subtitle}
          </Typography>
        )}

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
          <Paper
            sx={{
              p: 2,
              borderRadius: 1,
              border: `1px solid ${BRAND.border}`,
            }}
          >
            <Typography
              sx={{
                fontWeight: 700,
                mb: 1.5,
                color: BRAND.primary,
                fontSize: "0.95rem",
              }}
            >
              {editId ? "Editar registro" : "Nuevo registro"}
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "1fr 1fr",
                  lg: "repeat(3, 1fr)",
                },
                gap: 1.5,
                alignItems: "start",
              }}
            >
              {fields.map((f) => {
                const fieldWrapSx = f.fullWidth ? { gridColumn: "1 / -1" } : undefined;
                if (f.type === "select") {
                  const parentField = f.dependsOn?.parentField;
                  const parentValue = parentField ? form[parentField] : true;
                  const opts = f.optionsApi
                    ? selectOptions[f.name] || []
                    : f.options || [];
                  const useMulti = !editId && f.multiCreate && multiEnabled[f.name];
                  const selectedMulti = (form[multiKey(f)] || [])
                    .map(String)
                    .map((id) => opts.find((o) => String(o[f.optionValue]) === id))
                    .filter(Boolean);
                  const multiHelper =
                    parentField && !parentValue
                      ? `Seleccione ${fields.find((x) => x.name === parentField)?.label || "el campo anterior"}`
                      : useMulti
                        ? selectedMulti.length
                          ? `${selectedMulti.length} sub área(s)`
                          : undefined
                        : undefined;

                  return (
                    <Box
                      key={f.name}
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1,
                        ...fieldWrapSx,
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        {useMulti ? (
                          <Autocomplete
                            multiple
                            size="small"
                            disableCloseOnSelect
                            limitTags={2}
                            options={opts}
                            value={selectedMulti}
                            getOptionLabel={(opt) => opt[f.optionLabel] || ""}
                            isOptionEqualToValue={(a, b) =>
                              String(a[f.optionValue]) === String(b[f.optionValue])
                            }
                            onChange={(_, value) => {
                              setForm((prev) => ({
                                ...prev,
                                [multiKey(f)]: value.map((o) =>
                                  String(o[f.optionValue]),
                                ),
                              }));
                            }}
                            disabled={parentField ? !parentValue : false}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label={f.label}
                                required={f.required}
                                helperText={multiHelper}
                              />
                            )}
                          />
                        ) : (
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label={f.label}
                            value={normalizeFieldValue(f, form[f.name])}
                            onChange={(e) => handleChange(f.name, e.target.value)}
                            required={f.required}
                            disabled={parentField ? !parentValue : false}
                            helperText={multiHelper}
                          >
                            {opts.map((opt) => (
                              <MenuItem
                                key={opt[f.optionValue]}
                                value={String(opt[f.optionValue])}
                              >
                                {opt[f.optionLabel]}
                              </MenuItem>
                            ))}
                          </TextField>
                        )}
                      </Box>
                      {!editId && f.multiCreate && (
                        <FormControlLabel
                          control={
                            <Checkbox
                              size="small"
                              checked={Boolean(multiEnabled[f.name])}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setMultiEnabled((prev) => ({
                                  ...prev,
                                  [f.name]: checked,
                                }));
                                setForm((prev) => ({
                                  ...prev,
                                  [f.name]: "",
                                  [multiKey(f)]: [],
                                }));
                              }}
                              disabled={parentField ? !parentValue : false}
                            />
                          }
                          label={f.multiLabel || `Varias ${f.label.toLowerCase()}s`}
                          sx={{
                            m: 0,
                            mt: 0.65,
                            flexShrink: 0,
                            maxWidth: 118,
                            alignItems: "flex-start",
                            "& .MuiFormControlLabel-label": {
                              fontSize: "0.72rem",
                              lineHeight: 1.15,
                              color: BRAND.primaryDark,
                              fontWeight: 700,
                            },
                          }}
                        />
                      )}
                    </Box>
                  );
                }
                if (f.type === "textarea") {
                  return (
                    <Box key={f.name} sx={fieldWrapSx}>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      minRows={2}
                      label={f.label}
                      value={normalizeFieldValue(f, form[f.name])}
                      onChange={(e) => handleChange(f.name, e.target.value)}
                      required={f.required}
                    />
                    </Box>
                  );
                }
                return (
                  <Box key={f.name} sx={fieldWrapSx}>
                  <TextField
                    fullWidth
                    size="small"
                    type={f.type === "number" ? "number" : "text"}
                    label={f.label}
                    value={normalizeFieldValue(f, form[f.name])}
                    onChange={(e) => handleChange(f.name, e.target.value)}
                    required={f.required}
                  />
                  </Box>
                );
              })}
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
              {editId && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={resetForm}
                  sx={{ textTransform: "none" }}
                >
                  Cancelar edición
                </Button>
              )}
            </Box>
          </Paper>

          <Paper sx={tablePaperSx}>
            <Box sx={tableToolbarSx}>
              <Typography sx={{ fontWeight: 700, color: BRAND.ink }}>
                Registros activos
                {filtrosActivos
                  ? ` (${filteredRows.length}${rows.length !== filteredRows.length ? ` / ${rows.length}` : ""})`
                  : ""}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
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
                      {columns.map((c) => (
                        <TableCell key={c.key} sx={tableHeadCellSx}>
                          {c.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          align="center"
                          sx={tableEmptyCellSx}
                        >
                          {filtrosActivos
                            ? "Sin registros para el área / sub área seleccionada"
                            : "Sin registros"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRows.map((row) => {
                        const isSel = selected && selected[idField] === row[idField];
                        return (
                          <TableRow
                            key={row[idField]}
                            hover
                            selected={isSel}
                            onClick={() => setSelected(isSel ? null : row)}
                            sx={{ cursor: "pointer" }}
                          >
                            {columns.map((c) => (
                              <TableCell key={c.key}>
                                {c.render ? c.render(row) : row[c.key] ?? "—"}
                              </TableCell>
                            ))}
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

export default CatalogCrud;
