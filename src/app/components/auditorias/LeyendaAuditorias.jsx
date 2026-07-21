"use client";

import { Box, Typography } from "@mui/material";
import { BRAND } from "@/libs/theme_palette";
import { COLOR_VENCIDA } from "@/libs/auditoria_fechas";

export const COLOR_TURNO_OK = "#2E7D32";
export const COLOR_TURNO_BLOQUEADO = "#ED6C02";

const ITEMS = [
  { label: "Pendiente", color: BRAND.muted },
  { label: "En progreso", color: BRAND.primary },
  { label: "Vencida — aún se puede auditar", color: COLOR_VENCIDA },
  { label: "Completada", color: "#2E7D32" },
  { label: "Disponible en este turno", color: COLOR_TURNO_OK },
  { label: "Otro turno / fuera de horario", color: COLOR_TURNO_BLOQUEADO },
];

export default function LeyendaAuditorias() {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: { xs: 1.25, sm: 2 },
        mb: 1.5,
      }}
    >
      {ITEMS.map((item) => (
        <Box
          key={item.label}
          sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
        >
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: 0.5,
              bgcolor: item.color,
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            sx={{ color: item.color, fontWeight: 700 }}
          >
            {item.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
