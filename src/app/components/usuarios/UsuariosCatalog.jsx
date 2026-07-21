"use client";

import React, { useCallback, useEffect, useState } from "react";
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
  InputAdornment,
} from "@mui/material";
import { PersonSearch, Save, Delete, Edit, Search } from "@mui/icons-material";
import { nombreCompletoEmpleado } from "@/libs/empleado_mapper";
import { isValidEmail } from "@/libs/email_utils";
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

function nombreCompleto(row) {
  return nombreCompletoEmpleado(row) || row.emp_nombre || "—";
}

function UsuariosCatalog() {
  const [empIdBusqueda, setEmpIdBusqueda] = useState("");
  const [empleado, setEmpleado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [niveles, setNiveles] = useState([]);
  const [idNivel, setIdNivel] = useState("");
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadNiveles = useCallback(async () => {
    const res = await fetch("/api/niveles-usuario");
    const data = await res.json();
    if (res.ok) setNiveles(data.data || []);
  }, []);

  const loadUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/usuarios");
      const data = await res.json();
      setUsuarios(res.ok && data.success ? data.data || [] : []);
    } catch {
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNiveles();
    loadUsuarios();
  }, [loadNiveles, loadUsuarios]);

  const resetForm = () => {
    setEmpleado(null);
    setEmpIdBusqueda("");
    setIdNivel("");
    setEditId(null);
    setSelected(null);
  };

  const buscarEmpleado = async () => {
    const id = empIdBusqueda.trim();
    if (!id) return;

    setBuscando(true);
    setError("");
    setSuccess("");
    setEmpleado(null);

    try {
      const res = await fetch(`/api/empleados/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Empleado no encontrado");
        return;
      }
      setEmpleado(data.data);
    } catch {
      setError("Error de conexión al buscar empleado");
    } finally {
      setBuscando(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") buscarEmpleado();
  };

  const handleGuardar = async () => {
    if (!editId && !empleado) return;
    if (!idNivel) {
      setError("Seleccione un nivel");
      return;
    }

    setGuardando(true);
    setError("");
    setSuccess("");

    try {
      if (editId) {
        const res = await fetch(`/api/usuarios/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_nivel_usuario: Number(idNivel) }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Error al actualizar");
          return;
        }
        setSuccess(data.message || "Usuario actualizado");
      } else {
        const res = await fetch("/api/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emp_id: empleado.emp_id,
            emp_nombre: empleado.emp_nombre,
            emp_apellido_paterno: empleado.emp_apellido_paterno,
            emp_apellido_materno: empleado.emp_apellido_materno,
            id_nivel_usuario: Number(idNivel),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Error al guardar");
          return;
        }
        setSuccess(data.message || "Usuario registrado");
      }
      resetForm();
      loadUsuarios();
    } catch {
      setError("Error de conexión al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const handleEditar = () => {
    if (!selected) return;
    setEditId(selected.id_usuario);
    setEmpleado({
      emp_id: selected.emp_id,
      emp_nombre: selected.emp_nombre,
      emp_apellido_paterno: selected.emp_apellido_paterno,
      emp_apellido_materno: selected.emp_apellido_materno,
    });
    setEmpIdBusqueda(selected.emp_id);
    setIdNivel(String(selected.id_nivel_usuario));
    setError("");
    setSuccess("");
  };

  const handleEliminar = async () => {
    if (!selected) return;
    if (!confirm(`¿Eliminar usuario ${selected.emp_id} - ${nombreCompleto(selected)}?`)) return;

    try {
      const res = await fetch(`/api/usuarios/${selected.id_usuario}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al eliminar");
        return;
      }
      setSuccess(data.message || "Usuario eliminado");
      resetForm();
      loadUsuarios();
    } catch {
      setError("Error de conexión al eliminar");
    }
  };

  return (
    <DashboardShell selectedItemId="usuarios">
      <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", width: "100%" }}>
        <Typography variant="h5" sx={pageTitleSx}>
          Usuarios
        </Typography>
        <Typography variant="body2" sx={pageSubtitleSx}>
          Busque empleados por número y asígneles un nivel (SALARY o ING-AMBIENTAL)
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
              {editId ? "Editar usuario" : "Registrar usuario"}
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
                gap: 1.5,
                alignItems: "start",
              }}
            >
              {!editId && (
                <>
                  <TextField
                    size="small"
                    label="Número de empleado"
                    value={empIdBusqueda}
                    onChange={(e) => setEmpIdBusqueda(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={buscando}
                    fullWidth
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonSearch sx={{ color: BRAND.primary }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={
                      buscando ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <Search />
                      )
                    }
                    disabled={buscando}
                    onClick={buscarEmpleado}
                    sx={{
                      bgcolor: BRAND.primary,
                      "&:hover": { bgcolor: BRAND.primaryDark },
                      textTransform: "none",
                      alignSelf: { sm: "end" },
                    }}
                  >
                    Buscar
                  </Button>
                </>
              )}

              {empleado && (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    borderRadius: 1,
                    borderColor: BRAND.border,
                    bgcolor: BRAND.hover,
                    gridColumn: { xs: "1 / -1", sm: editId ? "1 / -1" : "span 2" },
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: BRAND.muted, fontWeight: 600 }}
                  >
                    EMPLEADO ENCONTRADO
                  </Typography>
                  <Typography sx={{ fontWeight: 700, color: BRAND.ink, mt: 0.5, fontSize: "0.9rem" }}>
                    {nombreCompleto(empleado)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: BRAND.muted }}>
                    emp_id: {empleado.emp_id}
                  </Typography>
                  {!editId &&
                    !isValidEmail(String(empleado.emp_correo ?? "").trim()) && (
                    <Alert severity="warning" sx={{ mt: 1.5, py: 0 }}>
                      Correo no registrado en base de datos.
                    </Alert>
                  )}
                </Paper>
              )}

              <TextField
                select
                fullWidth
                size="small"
                label="Nivel"
                value={idNivel}
                onChange={(e) => setIdNivel(e.target.value)}
                disabled={!empleado}
              >
                {niveles.map((n) => (
                  <MenuItem
                    key={n.id_nivel_usuario}
                    value={String(n.id_nivel_usuario)}
                  >
                    {n.nombre}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<Save />}
                disabled={!empleado || guardando || !idNivel}
                onClick={handleGuardar}
                sx={{
                  bgcolor: BRAND.primary,
                  "&:hover": { bgcolor: BRAND.primaryDark },
                  textTransform: "none",
                }}
              >
                {guardando ? "Guardando..." : editId ? "Actualizar" : "Guardar"}
              </Button>
              {(editId || empleado) && (
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
                Usuarios registrados
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Edit />}
                  disabled={!selected}
                  onClick={handleEditar}
                  sx={{ textTransform: "none" }}
                >
                  Editar
                </Button>
                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  startIcon={<Delete />}
                  disabled={!selected}
                  onClick={handleEliminar}
                  sx={{ textTransform: "none" }}
                >
                  Eliminar
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
                      <TableCell sx={tableHeadCellSx}>emp_id</TableCell>
                      <TableCell sx={tableHeadCellSx}>Nombre</TableCell>
                      <TableCell sx={tableHeadCellSx}>Nivel</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {usuarios.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center" sx={tableEmptyCellSx}>
                          Sin usuarios registrados
                        </TableCell>
                      </TableRow>
                    ) : (
                      usuarios.map((u) => {
                        const sel = selected?.id_usuario === u.id_usuario;
                        return (
                          <TableRow
                            key={u.id_usuario}
                            hover
                            selected={sel}
                            onClick={() => setSelected(sel ? null : u)}
                            sx={{ cursor: "pointer" }}
                          >
                            <TableCell>{u.emp_id}</TableCell>
                            <TableCell>{nombreCompleto(u)}</TableCell>
                            <TableCell>{u.nivel_nombre}</TableCell>
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

export default UsuariosCatalog;
