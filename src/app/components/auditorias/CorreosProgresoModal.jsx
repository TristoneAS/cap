"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  LinearProgress,
  CircularProgress,
} from "@mui/material";
import { Email } from "@mui/icons-material";
import { BRAND } from "@/libs/theme_palette";

export default function CorreosProgresoModal({
  open,
  enviados = 0,
  total = 0,
  procesados = 0,
  terminado = false,
  errores = [],
}) {
  const pct = total > 0 ? Math.round((procesados / total) * 100) : 0;

  return (
    <Dialog
      open={open}
      onClose={() => {}}
      slotProps={{
        paper: {
          sx: { borderRadius: 2, minWidth: { xs: 300, sm: 420 }, p: 0.5 },
        },
      }}
    >
      <DialogContent sx={{ py: 3, px: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          {terminado ? (
            <Email sx={{ fontSize: 48, color: BRAND.primary }} />
          ) : (
            <CircularProgress size={48} sx={{ color: BRAND.primary }} />
          )}

          <Typography sx={{ fontWeight: 800, color: BRAND.ink, fontSize: "1.05rem", textAlign: "center" }}>
            {terminado ? "Envío de correos finalizado" : "Enviando correos de asignación"}
          </Typography>

          <Typography sx={{ color: BRAND.primaryDark, fontWeight: 700, fontSize: "1.25rem" }}>
            {enviados} de {total} correo{total === 1 ? "" : "s"} enviado{enviados === 1 ? "" : "s"}
          </Typography>

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
              <Typography
                variant="caption"
                sx={{ display: "block", textAlign: "center", mt: 0.75, color: BRAND.muted }}
              >
                Procesando {procesados} de {total}…
              </Typography>
            </Box>
          )}

          {terminado && errores.length > 0 && (
            <Box sx={{ width: "100%", mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: BRAND.muted, fontWeight: 700 }}>
                Algunos correos no se enviaron:
              </Typography>
              <Box component="ul" sx={{ mt: 0.5, mb: 0, pl: 2, maxHeight: 120, overflow: "auto" }}>
                {errores.map((msg) => (
                  <li key={msg}>
                    <Typography variant="caption" component="span">
                      {msg}
                    </Typography>
                  </li>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
