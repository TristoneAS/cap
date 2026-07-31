"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  CircularProgress,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { Email, Replay, Close } from "@mui/icons-material";
import { BRAND } from "@/libs/theme_palette";

function formatElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

export default function CorreosProgresoModal({
  open,
  enviados = 0,
  omitidos = 0,
  total = 0,
  procesados = 0,
  terminado = false,
  fallidos = [],
  reenviandoId = null,
  reenviandoTodos = false,
  onReenviarUno,
  onReenviarTodos,
  onCerrar,
}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef(null);

  useEffect(() => {
    if (!open) {
      startedAtRef.current = null;
      setElapsedMs(0);
      return;
    }

    if (!startedAtRef.current) {
      startedAtRef.current = Date.now();
    }

    const id = setInterval(() => {
      if (startedAtRef.current && !terminado) {
        setElapsedMs(Date.now() - startedAtRef.current);
      }
    }, 500);

    return () => clearInterval(id);
  }, [open, terminado]);

  useEffect(() => {
    if (open && terminado && startedAtRef.current) {
      setElapsedMs(Date.now() - startedAtRef.current);
    }
  }, [open, terminado]);

  const pct = total > 0 ? Math.round((procesados / total) * 100) : 0;
  const fallidosCount = fallidos.length || omitidos;
  const ocupado = Boolean(reenviandoId) || reenviandoTodos;
  const puedeCerrar = terminado && !ocupado;

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (puedeCerrar) onCerrar?.();
      }}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: { borderRadius: 2, minWidth: { xs: 300, sm: 440 }, p: 0.5 },
        },
      }}
    >
      <DialogContent sx={{ py: 3, px: 3, position: "relative" }}>
        {puedeCerrar && (
          <IconButton
            aria-label="Cerrar"
            onClick={onCerrar}
            sx={{ position: "absolute", top: 8, right: 8 }}
            size="small"
          >
            <Close fontSize="small" />
          </IconButton>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          {terminado && !ocupado ? (
            <Email sx={{ fontSize: 48, color: BRAND.primary }} />
          ) : (
            <CircularProgress size={48} sx={{ color: BRAND.primary }} />
          )}

          <Typography sx={{ fontWeight: 800, color: BRAND.ink, fontSize: "1.05rem", textAlign: "center" }}>
            {ocupado
              ? "Reenviando correos..."
              : terminado
                ? fallidosCount > 0
                  ? "Envío finalizado con pendientes"
                  : "Envío de correos finalizado"
                : "Enviando correos de asignación"}
          </Typography>

          <Typography sx={{ color: BRAND.primaryDark, fontWeight: 700, fontSize: "1.25rem" }}>
            {procesados} de {total} procesado{procesados === 1 ? "" : "s"}
          </Typography>

          {(enviados > 0 || fallidosCount > 0) && (
            <Typography variant="body2" sx={{ color: BRAND.muted, textAlign: "center" }}>
              {enviados} enviado{enviados === 1 ? "" : "s"}
              {fallidosCount > 0
                ? ` · ${fallidosCount} pendiente${fallidosCount === 1 ? "" : "s"}`
                : ""}
            </Typography>
          )}

          {open && (
            <Typography
              variant="body2"
              sx={{
                color: BRAND.muted,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Tiempo transcurrido: {formatElapsed(elapsedMs)}
              {terminado && !ocupado ? " (finalizado)" : ""}
            </Typography>
          )}

          {!terminado && total > 0 && (
            <Box sx={{ width: "100%" }}>
              <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: BRAND.soft,
                  "& .MuiLinearProgress-bar": { bgcolor: BRAND.primary, borderRadius: 4 },
                }}
              />
            </Box>
          )}

          {terminado && fallidos.length > 0 && (
            <Box sx={{ width: "100%", mt: 0.5 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  mb: 1,
                }}
              >
                <Typography variant="caption" sx={{ color: BRAND.muted, fontWeight: 700 }}>
                  No se enviaron ({fallidos.length}):
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={
                    reenviandoTodos ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <Replay />
                    )
                  }
                  disabled={ocupado}
                  onClick={onReenviarTodos}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    bgcolor: BRAND.primary,
                    "&:hover": { bgcolor: BRAND.primaryDark },
                    flexShrink: 0,
                  }}
                >
                  Reenviar todos
                </Button>
              </Box>

              <List
                dense
                sx={{
                  maxHeight: 220,
                  overflow: "auto",
                  border: `1px solid ${BRAND.border}`,
                  borderRadius: 1,
                  bgcolor: "#fff",
                  py: 0,
                }}
              >
                {fallidos.map((item) => (
                  <ListItem
                    key={item.id}
                    secondaryAction={
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={
                          reenviandoId === item.id ? (
                            <CircularProgress size={12} />
                          ) : (
                            <Replay fontSize="small" />
                          )
                        }
                        disabled={ocupado}
                        onClick={() => onReenviarUno?.(item)}
                        sx={{ textTransform: "none", minWidth: 96 }}
                      >
                        Reenviar
                      </Button>
                    }
                    sx={{ alignItems: "flex-start", pr: 12 }}
                  >
                    <ListItemText
                      primary={item.label}
                      secondary={item.error}
                      slotProps={{
                        primary: {
                          sx: {
                            fontWeight: 700,
                            fontSize: "0.82rem",
                            color: BRAND.ink,
                          },
                        },
                        secondary: {
                          sx: {
                            fontSize: "0.72rem",
                            color: BRAND.muted,
                            wordBreak: "break-word",
                          },
                        },
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {terminado && fallidos.length === 0 && (
            <Button
              variant="outlined"
              onClick={onCerrar}
              sx={{ textTransform: "none", fontWeight: 600, mt: 0.5 }}
            >
              Cerrar
            </Button>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
