"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Paper,
  TextField,
  MenuItem,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { Speed, ReportProblem, Close, Refresh, FilterAltOff } from "@mui/icons-material";
import DashboardShell from "@/app/components/DashboardShell";
import { BRAND } from "@/libs/theme_palette";
import {
  MESES,
  aniosDisponibles,
  appendPeriodoParams,
  labelPeriodo,
  periodoActualParts,
} from "@/libs/periodo_ui";
import {
  PAGE_MAX_WIDTH,
  pageSubtitleSx,
  pageTitleSx,
  tableHeadCellSx,
  tableHeadRowSx,
  tablePaperSx,
} from "@/libs/table_ui";
import {
  ChartSection,
  EficienciaPie,
  NcPieChart,
  NcTipoList,
  calcEficienciaListPoka,
  colorBarra,
} from "@/app/components/charts/CapChartWidgets";

const POKA_GREEN = "#00897B";

export default function GraficasPokaYoke() {
  const router = useRouter();
  const actual = periodoActualParts();
  const [anio, setAnio] = useState(actual.anio);
  const [mes, setMes] = useState("");
  const [auditorias, setAuditorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ncPokaItems, setNcPokaItems] = useState([]);
  const [ncPokaTotal, setNcPokaTotal] = useState(0);
  const [ncPokaMagico, setNcPokaMagico] = useState({});
  const [loadingPokaMagico, setLoadingPokaMagico] = useState(false);
  const [detalleNcSub, setDetalleNcSub] = useState(null);
  const [detalleNcItems, setDetalleNcItems] = useState([]);
  const [detalleNcLista, setDetalleNcLista] = useState([]);
  const [loadingDetalleNc, setLoadingDetalleNc] = useState(false);

  const anios = useMemo(() => aniosDisponibles(actual.anio), [actual.anio]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const audParams = new URLSearchParams();
      appendPeriodoParams(audParams, { anio, mes });
      const audRes = await fetch(`/api/auditorias?${audParams.toString()}`);
      const audData = await audRes.json();
      setAuditorias(audData.success ? audData.data || [] : []);
    } catch {
      setAuditorias([]);
    } finally {
      setLoading(false);
    }
  }, [anio, mes]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ limit: "12" });
        appendPeriodoParams(params, { anio, mes });
        const res = await fetch(`/api/auditorias/no-conformidades-poka?${params}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.success) {
          setNcPokaItems(data.data?.items || []);
          setNcPokaTotal(data.data?.total || 0);
        } else {
          setNcPokaItems([]);
          setNcPokaTotal(0);
        }
      } catch {
        if (!cancelled) {
          setNcPokaItems([]);
          setNcPokaTotal(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [anio, mes]);

  const eficienciaPokaStats = useMemo(
    () => calcEficienciaListPoka(auditorias),
    [auditorias],
  );

  const panoramaSubAreasPoka = useMemo(() => {
    const bySub = new Map();
    for (const a of auditorias) {
      const key = String(a.id_sub_area);
      if (!bySub.has(key)) {
        const areaNom = a.area_nombre || `Área ${a.id_area}`;
        const subNom = a.sub_area_nombre || `Sub área ${a.id_sub_area}`;
        bySub.set(key, {
          id_area: a.id_area,
          id_sub_area: a.id_sub_area,
          titulo: `${areaNom} - ${subNom}`,
          auditorias: [],
        });
      }
      bySub.get(key).auditorias.push(a);
    }
    return [...bySub.values()]
      .map((sub) => ({
        ...sub,
        efi: calcEficienciaListPoka(sub.auditorias),
      }))
      .sort((a, b) => String(a.titulo).localeCompare(String(b.titulo), "es"));
  }, [auditorias]);

  useEffect(() => {
    if (!panoramaSubAreasPoka.length) {
      setNcPokaMagico({});
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setLoadingPokaMagico(true);
      try {
        const entries = await Promise.all(
          panoramaSubAreasPoka.map(async (sub) => {
            const params = new URLSearchParams({
              limit: "8",
              id_area: String(sub.id_area),
              id_sub_area: String(sub.id_sub_area),
            });
            appendPeriodoParams(params, { anio, mes });
            const res = await fetch(
              `/api/auditorias/no-conformidades-poka?${params}`,
            );
            const data = await res.json();
            if (!res.ok || !data.success) {
              return [String(sub.id_sub_area), { items: [], total: 0 }];
            }
            return [
              String(sub.id_sub_area),
              { items: data.data?.items || [], total: data.data?.total || 0 },
            ];
          }),
        );
        if (!cancelled) setNcPokaMagico(Object.fromEntries(entries));
      } catch {
        if (!cancelled) setNcPokaMagico({});
      } finally {
        if (!cancelled) setLoadingPokaMagico(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [panoramaSubAreasPoka, anio, mes]);

  const abrirDetalleNc = useCallback(
    async (sub, ncResumen) => {
      if (!sub) return;
      setDetalleNcSub(sub);
      setDetalleNcItems(ncResumen?.items || []);
      setDetalleNcLista([]);
      setLoadingDetalleNc(true);
      try {
        const params = new URLSearchParams({
          detalle: "1",
          limit: "20",
          id_area: String(sub.id_area),
          id_sub_area: String(sub.id_sub_area),
        });
        appendPeriodoParams(params, { anio, mes });
        const res = await fetch(`/api/auditorias/no-conformidades-poka?${params}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setDetalleNcItems(data.data?.items || ncResumen?.items || []);
          setDetalleNcLista(data.data?.detalles || []);
        }
      } catch {
        setDetalleNcLista([]);
      } finally {
        setLoadingDetalleNc(false);
      }
    },
    [anio, mes],
  );

  const cerrarDetalleNc = () => {
    setDetalleNcSub(null);
    setDetalleNcItems([]);
    setDetalleNcLista([]);
  };

  return (
    <DashboardShell selectedItemId="graficas-poka-yoke">
      <Box sx={{ maxWidth: PAGE_MAX_WIDTH, mx: "auto", width: "100%" }}>
        <Typography sx={pageTitleSx}>Gráficas Poka Yoke</Typography>
        <Typography sx={pageSubtitleSx}>
          Misma vista que en Inicio (Calidad): eficiencia y NC Poka por periodo y sub área.
        </Typography>

        <Paper
          sx={{
            px: 2,
            py: 1.5,
            mb: 1.5,
            display: "flex",
            gap: 1,
            flexWrap: "wrap",
            alignItems: "center",
            border: `1px solid ${BRAND.border}`,
            borderRadius: 1,
          }}
        >
          <TextField select size="small" label="Año" value={anio} onChange={(e) => setAnio(e.target.value)} sx={{ minWidth: 100 }}>
            {anios.map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Mes" value={mes} onChange={(e) => setMes(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="">Todos</MenuItem>
            {MESES.map((m) => (
              <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
            ))}
          </TextField>
          <Button size="small" startIcon={<FilterAltOff />} onClick={() => { setAnio(actual.anio); setMes(""); }} sx={{ textTransform: "none" }}>
            Limpiar
          </Button>
          <Button size="small" startIcon={<Refresh />} onClick={load} sx={{ textTransform: "none" }}>
            Actualizar
          </Button>
          <Typography variant="caption" sx={{ color: BRAND.muted, fontWeight: 600, ml: { sm: "auto" } }}>
            {labelPeriodo(anio, mes)}
          </Typography>
        </Paper>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress sx={{ color: POKA_GREEN }} />
          </Box>
        ) : (
          <>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1, mb: 1.5 }}>
              <ChartSection
                sx={{ mb: 0 }}
                title={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Speed sx={{ color: POKA_GREEN, fontSize: 18 }} />
                    Eficiencia global
                    {eficienciaPokaStats.pct != null && (
                      <Typography component="span" sx={{ fontWeight: 800, color: colorBarra(eficienciaPokaStats.pct) }}>
                        {eficienciaPokaStats.pct}%
                      </Typography>
                    )}
                  </Box>
                }
                hint="Planta · completadas · no exentas"
              >
                {eficienciaPokaStats.sumTotal === 0 ? (
                  <Box sx={{ py: 2, textAlign: "center", color: BRAND.muted, fontSize: 13 }}>Sin datos Poka Yoke</Box>
                ) : (
                  <EficienciaPie pct={eficienciaPokaStats.pct} sumSi={eficienciaPokaStats.sumSi} sumNo={eficienciaPokaStats.sumNo} height={160} />
                )}
              </ChartSection>
              <ChartSection
                sx={{ mb: 0 }}
                title={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <ReportProblem sx={{ color: "#00695C", fontSize: 18 }} />
                    NC global
                    {ncPokaTotal > 0 && (
                      <Typography component="span" sx={{ fontWeight: 700, color: BRAND.muted }}>{ncPokaTotal}</Typography>
                    )}
                  </Box>
                }
                hint="NC Poka en el periodo"
              >
                {ncPokaItems.length === 0 ? (
                  <Box sx={{ py: 2, textAlign: "center", color: BRAND.muted, fontSize: 13 }}>No hay NC Poka Yoke</Box>
                ) : (
                  <Box>
                    <NcPieChart data={ncPokaItems} height={160} hideLegend />
                    <NcTipoList items={ncPokaItems} />
                  </Box>
                )}
              </ChartSection>
            </Box>

            <Typography sx={{ fontWeight: 800, fontSize: "0.85rem", color: "#00695C", mb: 0.75 }}>Por área y sub área</Typography>
            {loadingPokaMagico && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 1.5 }}>
                <CircularProgress size={24} sx={{ color: POKA_GREEN }} />
              </Box>
            )}
            {panoramaSubAreasPoka.length === 0 ? (
              <Box sx={{ py: 4, textAlign: "center", color: BRAND.muted }}>No hay auditorías en el periodo</Box>
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr", lg: "1fr 1fr 1fr 1fr" }, gap: 1 }}>
                {panoramaSubAreasPoka.map((sub) => {
                  const nc = ncPokaMagico[String(sub.id_sub_area)] || { items: [], total: 0 };
                  const tieneNc = nc.total > 0;
                  return (
                    <Paper
                      key={sub.id_sub_area}
                      onClick={() => tieneNc && abrirDetalleNc(sub, nc)}
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        border: `1px solid ${tieneNc ? "rgba(0,137,123,0.35)" : BRAND.border}`,
                        cursor: tieneNc ? "pointer" : "default",
                      }}
                    >
                      <Typography noWrap sx={{ fontWeight: 800, fontSize: "0.78rem" }}>{sub.titulo}</Typography>
                      <Typography variant="caption" sx={{ color: BRAND.muted, display: "block", mb: 0.75 }}>
                        {sub.efi.pct != null ? `Efi ${sub.efi.pct}%` : "—"}
                        {nc.total > 0 ? ` · ${nc.total} NC` : ""}
                      </Typography>
                      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75 }}>
                        {sub.efi.sumTotal === 0 ? (
                          <Box sx={{ py: 2, textAlign: "center", color: BRAND.muted, fontSize: 11, gridColumn: "1 / -1" }}>—</Box>
                        ) : (
                          <EficienciaPie pct={sub.efi.pct} sumSi={sub.efi.sumSi} sumNo={sub.efi.sumNo} height={118} hideLegend />
                        )}
                        {nc.items.length === 0 ? null : <NcPieChart data={nc.items} height={118} hideLegend />}
                      </Box>
                      {nc.items.length > 0 && <NcTipoList items={nc.items} dense max={4} />}
                    </Paper>
                  );
                })}
              </Box>
            )}
          </>
        )}

        <Dialog open={Boolean(detalleNcSub)} onClose={cerrarDetalleNc} fullWidth maxWidth="md">
          <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ReportProblem sx={{ color: "#00695C" }} />
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 800 }}>Detalle NC Poka Yoke</Typography>
              <Typography variant="caption">{detalleNcSub?.titulo}</Typography>
            </Box>
            <IconButton onClick={cerrarDetalleNc}><Close /></IconButton>
          </DialogTitle>
          <DialogContent>
            {loadingDetalleNc ? (
              <CircularProgress sx={{ display: "block", mx: "auto", my: 4, color: POKA_GREEN }} />
            ) : detalleNcLista.length === 0 ? (
              <Typography sx={{ color: BRAND.muted }}>Sin hallazgos</Typography>
            ) : (
              <TableContainer component={Paper} sx={{ ...tablePaperSx, maxHeight: 360 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={tableHeadRowSx}>
                      <TableCell sx={tableHeadCellSx}>Tipo NC</TableCell>
                      <TableCell sx={tableHeadCellSx}>Pregunta</TableCell>
                      <TableCell sx={tableHeadCellSx}>Hallazgo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detalleNcLista.map((d) => (
                      <TableRow key={d.id_respuesta} hover sx={{ cursor: "pointer" }} onClick={() => router.push(`/dashboard/auditorias/${d.id_auditoria}`)}>
                        <TableCell><Chip size="small" label={d.tipo_nc_nombre} /></TableCell>
                        <TableCell sx={{ fontSize: "0.78rem" }}>{d.pregunta_texto || d.pregunta_poka}</TableCell>
                        <TableCell sx={{ fontSize: "0.78rem" }}>{d.hallazgo}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </DashboardShell>
  );
}
