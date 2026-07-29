"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  TextField,
  CircularProgress,
} from "@mui/material";
import { AutoMode, Email, Visibility } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import DashboardShell from "@/app/components/DashboardShell";
import CorreosProgresoModal from "@/app/components/auditorias/CorreosProgresoModal";
import { BRAND } from "@/libs/theme_palette";

const emptyCorreoProgress = {
  open: false,
  enviados: 0,
  total: 0,
  procesados: 0,
  terminado: false,
  errores: [],
};

function GenerarAuditorias() {
  const router = useRouter();
  const [periodo, setPeriodo] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [loading, setLoading] = useState(false);
  const [loadingCorreos, setLoadingCorreos] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [yaGenerado, setYaGenerado] = useState(false);
  const [infoGeneracion, setInfoGeneracion] = useState(null);
  const [correoProgress, setCorreoProgress] = useState(emptyCorreoProgress);

  const cargarEstado = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/auditorias/generacion-estado?periodo_mes=${encodeURIComponent(periodo)}`,
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setYaGenerado(Boolean(data.data?.ya_generado));
        setInfoGeneracion(data.data?.generacion || null);
      }
    } catch {
      /* ignore */
    }
  }, [periodo]);

  useEffect(() => {
    cargarEstado();
  }, [cargarEstado]);

  const enviarCorreosConProgreso = async (asignaciones, periodoMes) => {
    const lista = asignaciones || [];
    const total = lista.length;

    if (!total) {
      return { correos_enviados: 0, correos_omitidos: 0, errores: [] };
    }

    setCorreoProgress({
      open: true,
      enviados: 0,
      total,
      procesados: 0,
      terminado: false,
      errores: [],
    });

    let correos_enviados = 0;
    let correos_omitidos = 0;
    const errores = [];

    for (let i = 0; i < lista.length; i += 1) {
      const item = lista[i];
      try {
        const res = await fetch("/api/auditorias/notificar-asignaciones/uno", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            periodo_mes: periodoMes,
            emp_id: item.emp_id,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          correos_enviados += 1;
        } else {
          correos_omitidos += 1;
          errores.push(data.error || `Error con ${item.emp_id}`);
        }
      } catch {
        correos_omitidos += 1;
        errores.push(`Error de conexión con ${item.emp_id}`);
      }

      setCorreoProgress({
        open: true,
        enviados: correos_enviados,
        total,
        procesados: i + 1,
        terminado: false,
        errores: [...errores],
      });
    }

    setCorreoProgress({
      open: true,
      enviados: correos_enviados,
      total,
      procesados: total,
      terminado: true,
      errores,
    });

    await new Promise((resolve) => setTimeout(resolve, 1200));
    setCorreoProgress(emptyCorreoProgress);

    return { correos_enviados, correos_omitidos, errores };
  };

  const handleGenerar = async () => {
    if (yaGenerado) {
      setError(`Ya se generaron las auditorías del periodo ${periodo}. Solo una vez por mes.`);
      return;
    }

    if (
      !confirm(
        `¿Generar auditorías para el periodo ${periodo}? Solo se permite una vez por mes. Todos los usuarios activos del nivel recibirán al menos una asignación (compartida si hay más usuarios que áreas).`,
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/auditorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodo_mes: periodo, enviar_correos: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setYaGenerado(true);
          setInfoGeneracion(data.details?.generacion || data.data?.generacion || null);
        }
        setError(data.error || "Error al generar");
        return;
      }

      const generacion = data.data || {};
      let correos = {
        correos_enviados: 0,
        correos_omitidos: 0,
        errores: [],
      };

      const asignaciones = generacion.asignaciones_correo || [];
      if (asignaciones.length > 0) {
        correos = await enviarCorreosConProgreso(asignaciones, periodo);
      }

      setResult({
        ...generacion,
        correos_enviados: correos.correos_enviados,
        correos_omitidos: correos.correos_omitidos,
        errores_correo: correos.errores,
      });
      setYaGenerado(true);
      cargarEstado();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleReenviarCorreos = async () => {
    setLoadingCorreos(true);
    setError("");
    try {
      const listRes = await fetch(
        `/api/auditorias/notificar-asignaciones?periodo_mes=${encodeURIComponent(periodo)}`,
      );
      const listData = await listRes.json();
      if (!listRes.ok) {
        setError(listData.error || "Error al obtener destinatarios");
        return;
      }

      const asignaciones = listData.data?.asignaciones || [];
      const correos = await enviarCorreosConProgreso(asignaciones, periodo);

      setResult({
        tipo: "correos",
        periodo_mes: periodo,
        usuarios: asignaciones.length,
        correos_enviados: correos.correos_enviados,
        correos_omitidos: correos.correos_omitidos,
        errores_correo: correos.errores,
      });
    } catch {
      setError("Error de conexión al enviar correos");
    } finally {
      setLoadingCorreos(false);
    }
  };

  return (
    <DashboardShell selectedItemId="generar-auditorias">
      <CorreosProgresoModal {...correoProgress} />

      <Box sx={{ maxWidth: 640, mx: "auto" }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: BRAND.ink, mb: 1 }}>
          Generar auditorías del mes
        </Typography>
        <Typography variant="body2" sx={{ color: BRAND.muted, mb: 3 }}>
          Genera solo combinaciones que existen en <strong>Preguntas</strong> (área +
          sub área + tipo). Por cada combinación crea <strong>turno A</strong> y{" "}
          <strong>turno B</strong>. Si hay más usuarios que áreas, se reparten para que{" "}
          <strong>todos auditen al menos una</strong> (algunas áreas compartidas).
          Solo se puede generar <strong>una vez por mes</strong>. Vencimiento: día{" "}
          <strong>25</strong>. El día <strong>1</strong> también puede ejecutarse al
          entrar al sistema.
        </Typography>

        {yaGenerado && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Ya se generaron auditorías para <strong>{periodo}</strong>
            {infoGeneracion?.fecha_generacion
              ? ` el ${String(infoGeneracion.fecha_generacion).slice(0, 10)}`
              : ""}
            {infoGeneracion?.creadas != null
              ? ` (${infoGeneracion.creadas} creadas).`
              : "."}{" "}
            Use &quot;Reenviar correos&quot; si hace falta, no vuelva a generar.
          </Alert>
        )}

        <Paper sx={{ p: 3, borderRadius: 1 }}>
          <TextField
            fullWidth
            label="Periodo (YYYY-MM)"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <AutoMode />}
            disabled={loading || loadingCorreos || yaGenerado}
            onClick={handleGenerar}
            sx={{
              bgcolor: BRAND.primary,
              "&:hover": { bgcolor: BRAND.primaryDark },
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            {loading ? "Generando..." : "Generar auditorías"}
          </Button>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          {result && (
            <Alert
              severity={
                result.tipo === "correos"
                  ? (result.correos_omitidos || result.errores_correo?.length
                      ? "warning"
                      : "success")
                  : result.creadas > 0
                    ? result.correos_enviados > 0 || !result.errores_correo?.length
                      ? "success"
                      : "warning"
                    : "warning"
              }
              sx={{ mt: 2 }}
            >
              {result.tipo === "correos" ? (
                <>
                  Reenvío de correos — periodo {result.periodo_mes}:{" "}
                  {result.correos_enviados} enviado(s) a auditores
                  {result.usuarios ? ` (${result.usuarios} persona(s))` : ""}
                  {result.correos_omitidos > 0
                    ? `, ${result.correos_omitidos} no enviado(s)`
                    : ""}
                  .
                </>
              ) : (
                <>
                  Periodo {result.periodo_mes}: {result.creadas} creadas (turnos A/B),{" "}
                  {result.omitidas} omitidas de {result.total_combos} combinaciones
                  área/sub área/tipo ({result.total_slots} slots)
                  {result.sin_auditor_nivel
                    ? `. ${result.sin_auditor_nivel} sin auditor del nivel`
                    : ""}
                  {result.total_combos_sin_auditor
                    ? `. ${result.total_combos_sin_auditor} combos sin auditor`
                    : ""}
                  {result.correos_enviados != null
                    ? `. ${result.correos_enviados} correo(s) enviado(s) a auditores`
                    : ""}
                  {result.correos_omitidos > 0
                    ? `. ${result.correos_omitidos} correo(s) no enviado(s)`
                    : ""}
                  .
                </>
              )}
              {result.errores_correo?.length > 0 && (
                <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                  {result.errores_correo.map((msg) => (
                    <li key={msg}>
                      <Typography variant="caption" component="span">
                        {msg}
                      </Typography>
                    </li>
                  ))}
                </Box>
              )}
            </Alert>
          )}

          <Box sx={{ mt: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={
                loadingCorreos ? <CircularProgress size={16} /> : <Email />
              }
              disabled={loadingCorreos || loading}
              onClick={handleReenviarCorreos}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {loadingCorreos ? "Enviando correos..." : "Reenviar correos del periodo"}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Visibility />}
              onClick={() => router.push("/dashboard/auditorias/seguimiento")}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Ver seguimiento del mes
            </Button>
          </Box>
        </Paper>
      </Box>
    </DashboardShell>
  );
}

export default GenerarAuditorias;
