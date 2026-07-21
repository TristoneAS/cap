"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
} from "@mui/material";
import { SupportAgent } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { clearAuthStorageClient } from "@/libs/auth_session";
import { BRAND } from "@/libs/theme_palette";

function UsuarioBloqueadoModal({ open, empId }) {
  const router = useRouter();

  const handleLogout = () => {
    clearAuthStorageClient();
    router.replace("/");
  };

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      onClose={() => {}}
      PaperProps={{
        sx: {
          borderRadius: 1,
          maxWidth: 440,
          overflow: "hidden",
        },
      }}
    >
      <Box
        sx={{
          height: 6,
          background: `linear-gradient(90deg, ${BRAND.primaryDark}, ${BRAND.primary}, ${BRAND.primaryLight})`,
        }}
      />
      <DialogContent sx={{ p: 4, textAlign: "center" }}>
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            bgcolor: BRAND.hover,
            color: BRAND.primaryDark,
            display: "grid",
            placeItems: "center",
            mx: "auto",
            mb: 2,
          }}
        >
          <SupportAgent sx={{ fontSize: 40 }} />
        </Box>

        <Typography variant="h6" sx={{ fontWeight: 800, color: BRAND.ink, mb: 1 }}>
          Acceso no autorizado
        </Typography>

        <Typography sx={{ color: BRAND.muted, mb: 1, lineHeight: 1.6 }}>
          Tu usuario no está registrado en el sistema CAP.
        </Typography>

        {empId && (
          <Typography variant="body2" sx={{ color: BRAND.muted, mb: 2 }}>
            Número de empleado: <strong>{empId}</strong>
          </Typography>
        )}

        <Typography sx={{ color: BRAND.ink, fontWeight: 600, mb: 3 }}>
          Comuníquese con soporte para solicitar su alta en el sistema.
        </Typography>

        <Button
          fullWidth
          variant="contained"
          onClick={handleLogout}
          sx={{
            bgcolor: BRAND.primary,
            "&:hover": { bgcolor: BRAND.primaryDark },
            textTransform: "none",
            fontWeight: 700,
            py: 1.25,
          }}
        >
          Cerrar sesión
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default UsuarioBloqueadoModal;
