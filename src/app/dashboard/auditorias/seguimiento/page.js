import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import RequireAdminRoute from "@/app/components/RequireAdminRoute";
import SeguimientoAuditorias from "@/app/components/auditorias/SeguimientoAuditorias";

function SeguimientoFallback() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
      <CircularProgress />
    </Box>
  );
}

export default function Page() {
  return (
    <RequireAdminRoute>
      <Suspense fallback={<SeguimientoFallback />}>
        <SeguimientoAuditorias />
      </Suspense>
    </RequireAdminRoute>
  );
}
