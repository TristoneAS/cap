import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import ExecutarAuditoria from "@/app/components/auditorias/ExecutarAuditoria";

function EjecutarFallback() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
      <CircularProgress />
    </Box>
  );
}

export default async function Page({ params }) {
  const { id } = await params;
  return (
    <Suspense fallback={<EjecutarFallback />}>
      <ExecutarAuditoria idAuditoria={id} />
    </Suspense>
  );
}
