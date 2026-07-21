"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  TextField,
  MenuItem,
  Button,
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
import {
  FactCheck,
  Business,
  Assignment,
  FilterAltOff,
  Speed,
  ReportProblem,
  ArrowBack,
  AutoAwesome,
  Close,
  FileDownload,
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LabelList,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { useRouter } from "next/navigation";
import DashboardShell from "./DashboardShell";
import { BRAND } from "@/libs/theme_palette";
import {
  MESES,
  aniosDisponibles,
  appendPeriodoParams,
  labelPeriodo,
  periodoActualParts,
} from "@/libs/periodo_ui";
import {
  tableHeadCellSx,
  tableHeadRowSx,
  tablePaperSx,
} from "@/libs/table_ui";
import { exportVistaMagicaExcel } from "@/libs/export_vista_magica_excel";

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Paper
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: 1,
        border: `1px solid ${BRAND.border}`,
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 1,
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: 1,
          bgcolor: `${color}18`,
          color,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          "& .MuiSvgIcon-root": { fontSize: 18 },
        }}
      >
        <Icon />
      </Box>
      <Typography
        variant="caption"
        sx={{
          color: BRAND.muted,
          fontWeight: 600,
          lineHeight: 1.2,
          flex: 1,
          minWidth: 0,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: "1.35rem",
          color: BRAND.ink,
          lineHeight: 1,
          textAlign: "center",
          minWidth: 40,
          flexShrink: 0,
        }}
      >
        {value}
      </Typography>
    </Paper>
  );
}

function valorAvance(estado) {
  return String(estado || "").toLowerCase() === "completada" ? 100 : 0;
}

function colorBarra(pct) {
  if (pct >= 90) return "#2E7D32";
  if (pct >= 70) return BRAND.primary;
  if (pct >= 50) return BRAND.primaryLight;
  if (pct > 0) return "#EF6C00";
  return "#90A4AE";
}

const NC_COLORS = [
  "#C62828",
  "#EF6C00",
  "#F9A825",
  BRAND.primary,
  "#00897B",
  "#6A1B9A",
  "#1565C0",
  "#455A64",
];

const ROW_H = 36;
const BAR_MIN = 16;
const BAR_MAX = 64;

function HorizontalPctChart({
  data,
  dataKey = "avance",
  nameKey = "nombre",
  tooltipLabel = "Avance",
  onBarClick,
  showXAxis = true,
  yWidth = 100,
  getFill,
  rowKey = "id",
  selectedId,
  fillContainer = false,
}) {
  const wrapRef = React.useRef(null);
  const [boxH, setBoxH] = useState(0);

  useEffect(() => {
    if (!fillContainer) return undefined;
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h > 0) setBoxH(h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fillContainer, data.length]);

  const n = Math.max(data.length, 1);
  const axisH = showXAxis ? 24 : 6;
  const fallbackH = Math.max(120, n * ROW_H + axisH);
  // Altura explícita en px (evita ResponsiveContainer a 0px)
  const chartH =
    fillContainer && boxH > 40
      ? boxH
      : fillContainer
        ? Math.max(fallbackH, 180)
        : fallbackH;

  const usable = Math.max(48, chartH - axisH - 8);
  const slot = usable / n;
  const barSize = Math.max(
    BAR_MIN,
    Math.min(BAR_MAX, Math.floor(slot * 0.78)),
  );
  const gapPx = Math.max(4, slot - barSize);
  const categoryGapPct = Math.min(
    35,
    Math.round((gapPx / Math.max(slot, 1)) * 100),
  );

  return (
    <Box
      ref={wrapRef}
      sx={{
        width: "100%",
        height: fillContainer ? "100%" : chartH,
        minHeight: fillContainer ? 160 : undefined,
        flex: fillContainer ? 1 : undefined,
      }}
    >
      <ResponsiveContainer width="100%" height={chartH}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 44, left: 0, bottom: showXAxis ? 2 : 0 }}
          barCategoryGap={`${categoryGapPct}%`}
        >
          <XAxis
            type="number"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            stroke={BRAND.muted}
            tick={{ fontSize: 9 }}
            height={showXAxis ? 18 : 0}
            hide={!showXAxis}
          />
          <YAxis
            type="category"
            dataKey={nameKey}
            width={yWidth}
            stroke={BRAND.muted}
            tick={{ fontSize: 11 }}
            interval={0}
          />
          <Tooltip
            formatter={(value) => [`${value}%`, tooltipLabel]}
            labelFormatter={(label, payload) => {
              const extra = payload?.[0]?.payload?.extra;
              return extra ? `${label} · ${extra}` : label;
            }}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar
            dataKey={dataKey}
            radius={[0, 4, 4, 0]}
            barSize={barSize}
            cursor={onBarClick ? "pointer" : "default"}
            onClick={(d) => onBarClick?.(d?.payload || d)}
          >
            {data.map((entry, i) => {
              const id = entry[rowKey] ?? entry.id;
              const selected =
                selectedId != null && String(selectedId) === String(id);
              return (
                <Cell
                  key={id ?? `${entry[nameKey]}-${i}`}
                  fill={
                    getFill ? getFill(entry, i) : colorBarra(entry[dataKey])
                  }
                  stroke={selected ? BRAND.ink : "transparent"}
                  strokeWidth={selected ? 2 : 0}
                />
              );
            })}
            <LabelList
              dataKey={dataKey}
              position="right"
              content={({ x, y, width, height, value }) => {
                if (x == null || y == null) return null;
                const w = Number(width) || 0;
                const h = Number(height) || 0;
                const n = Number(value);
                const label = Number.isFinite(n) ? `${n}%` : "0%";
                return (
                  <text
                    x={x + w + 6}
                    y={y + h / 2}
                    fill={BRAND.ink}
                    fontSize={11}
                    fontWeight={800}
                    dominantBaseline="middle"
                  >
                    {label}
                  </text>
                );
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}

function EficienciaPie({ pct, sumSi, sumNo, height = 250, hideLegend = false }) {
  const data =
    sumSi + sumNo > 0
      ? [
          {
            id: "si",
            nombre: "Cumple (Sí)",
            total: sumSi,
            porcentaje: Math.round((sumSi / (sumSi + sumNo)) * 100),
          },
          {
            id: "no",
            nombre: "No cumple",
            total: sumNo,
            porcentaje: Math.round((sumNo / (sumSi + sumNo)) * 100),
          },
        ].filter((d) => d.total > 0)
      : [];

  const colors = { si: "#2E7D32", no: "#C62828" };

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          width: "100%",
          height: hideLegend ? height : Math.max(110, height - 48),
          position: "relative",
        }}
      >
        <ResponsiveContainer>
          <PieChart
            margin={
              height < 140
                ? { top: 2, right: 4, bottom: 2, left: 4 }
                : { top: 4, right: 8, bottom: 0, left: 8 }
            }
          >
            <Pie
              data={data}
              dataKey="total"
              nameKey="nombre"
              cx="50%"
              cy="50%"
              innerRadius={height < 140 ? 24 : height < 200 ? 32 : 48}
              outerRadius={height < 140 ? 40 : height < 200 ? 52 : 72}
              paddingAngle={2}
              label={({ value, cx, cy, midAngle, innerRadius, outerRadius }) => {
                const n = Number(value) || 0;
                if (n <= 0 || midAngle == null) return null;
                const RADIAN = Math.PI / 180;
                const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return (
                  <text
                    x={x}
                    y={y}
                    fill="#fff"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={height < 140 ? 9 : 11}
                    fontWeight={800}
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}
                  >
                    {n}
                  </text>
                );
              }}
              labelLine={false}
            >
              {data.map((entry) => (
                <Cell key={entry.id} fill={colors[entry.id] || BRAND.primary} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name, props) => {
                const p = props?.payload?.porcentaje ?? 0;
                return [`${value} (${p}%)`, name];
              }}
              contentStyle={{ fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        {pct != null && (
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <Typography
              sx={{
                fontWeight: 900,
                fontSize:
                  height < 140 ? "0.9rem" : height < 200 ? "1.1rem" : "1.35rem",
                color: colorBarra(pct),
                lineHeight: 1,
              }}
            >
              {pct}%
            </Typography>
          </Box>
        )}
      </Box>
      {!hideLegend && data.length > 0 && (
        <Box
          sx={{
            mt: 0.75,
            pt: 0.75,
            borderTop: `1px dashed rgba(46, 125, 50, 0.35)`,
          }}
        >
          <Typography
            sx={{
              fontSize: "0.68rem",
              fontWeight: 800,
              color: "#2E7D32",
              textTransform: "uppercase",
              letterSpacing: 0.4,
              mb: 0.5,
            }}
          >
            Leyenda eficiencia
          </Typography>
          <Box sx={{ display: "grid", gap: 0.4 }}>
            {data.map((entry) => (
              <Box
                key={entry.id}
                sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: 0.5,
                    bgcolor: colors[entry.id],
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    flex: 1,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: BRAND.ink,
                  }}
                >
                  {entry.nombre}
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    color: colors[entry.id],
                  }}
                >
                  {entry.total} ({entry.porcentaje}%)
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function NcPieChart({ data, height = 250, hideLegend = false }) {
  const total = data.reduce((s, d) => s + (Number(d.total) || 0), 0);

  return (
    <Box sx={{ width: "100%", height, position: "relative" }}>
      <ResponsiveContainer>
        <PieChart
          margin={
            height < 140
              ? { top: 2, right: 4, bottom: 2, left: 4 }
              : { top: 4, right: 8, bottom: 0, left: 8 }
          }
        >
          <Pie
            data={data}
            dataKey="total"
            nameKey="nombre"
            cx="50%"
            cy={hideLegend ? "50%" : "46%"}
            innerRadius={height < 140 ? 20 : height < 200 ? 28 : 42}
            outerRadius={height < 140 ? 36 : height < 200 ? 48 : 68}
            paddingAngle={2}
            label={({ value, cx, cy, midAngle, innerRadius, outerRadius }) => {
              const n = Number(value) || 0;
              if (n <= 0 || midAngle == null) return null;
              const RADIAN = Math.PI / 180;
              const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);
              return (
                <text
                  x={x}
                  y={y}
                  fill="#fff"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={height < 140 ? 9 : 11}
                  fontWeight={800}
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}
                >
                  {n}
                </text>
              );
            }}
            labelLine={false}
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.id_tipo_nc}
                fill={NC_COLORS[i % NC_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name, props) => {
              const pct = props?.payload?.porcentaje ?? 0;
              return [`${value} (${pct}%)`, name];
            }}
            contentStyle={{ fontSize: 12 }}
          />
          {!hideLegend && (
            <Legend
              verticalAlign="bottom"
              height={40}
              wrapperStyle={{ fontSize: 10 }}
              formatter={(value, entry) => {
                const pct = entry?.payload?.porcentaje ?? 0;
                const n = entry?.payload?.total ?? 0;
                const name =
                  value.length > 16 ? `${value.slice(0, 14)}…` : value;
                return `${name}: ${n} (${pct}%)`;
              }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      {total > 0 && (
        <Box
          sx={{
            position: "absolute",
            top: hideLegend ? "50%" : "42%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <Typography
            sx={{
              fontWeight: 900,
              fontSize:
                height < 140 ? "0.95rem" : height < 200 ? "1.15rem" : "1.4rem",
              color: "#C62828",
              lineHeight: 1,
            }}
          >
            {total}
          </Typography>
          {height >= 140 && (
            <Typography
              sx={{
                fontSize: "0.58rem",
                fontWeight: 800,
                color: BRAND.muted,
                letterSpacing: 0.3,
                mt: 0.15,
              }}
            >
              NC
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

/** Lista compacta de tipos NC (desglose / leyenda de la gráfica de NC). */
function NcTipoList({ items, dense = false, max = 6, showTitle = true }) {
  if (!items?.length) return null;
  const list = items.slice(0, max);
  const extra = items.length - list.length;
  return (
    <Box
      sx={{
        mt: dense ? 0.5 : 1,
        pt: dense ? 0.5 : 0.75,
        borderTop: `1px dashed rgba(198, 40, 40, 0.35)`,
      }}
    >
      {showTitle && (
        <Typography
          sx={{
            fontSize: dense ? "0.58rem" : "0.68rem",
            fontWeight: 800,
            color: "#C62828",
            textTransform: "uppercase",
            letterSpacing: 0.4,
            mb: dense ? 0.35 : 0.5,
          }}
        >
          Leyenda NC
        </Typography>
      )}
      <Box sx={{ display: "grid", gap: dense ? 0.35 : 0.5 }}>
        {list.map((item, i) => (
          <Box
            key={item.id_tipo_nc}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                width: dense ? 8 : 10,
                height: dense ? 8 : 10,
                borderRadius: 0.5,
                bgcolor: NC_COLORS[i % NC_COLORS.length],
                flexShrink: 0,
              }}
            />
            <Typography
              title={item.nombre}
              noWrap
              sx={{
                flex: 1,
                minWidth: 0,
                fontSize: dense ? "0.65rem" : "0.75rem",
                color: BRAND.ink,
                fontWeight: 600,
                lineHeight: 1.2,
              }}
            >
              {item.nombre}
            </Typography>
            <Typography
              sx={{
                fontSize: dense ? "0.65rem" : "0.75rem",
                fontWeight: 800,
                color: "#C62828",
                flexShrink: 0,
              }}
            >
              {item.total}
              {!dense && item.porcentaje != null ? ` (${item.porcentaje}%)` : ""}
            </Typography>
          </Box>
        ))}
        {extra > 0 && (
          <Typography
            sx={{
              fontSize: dense ? "0.62rem" : "0.7rem",
              color: BRAND.muted,
              fontWeight: 700,
            }}
          >
            +{extra} tipo(s) más
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function ChartSection({ title, hint, children, actions, sx, bodySx }) {
  return (
    <Paper
      sx={{
        p: 1,
        borderRadius: 1,
        border: `1px solid ${BRAND.border}`,
        mb: 2,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        ...sx,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          alignItems: "center",
          mb: 0.5,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            fontWeight: 800,
            color: BRAND.ink,
            flex: 1,
            minWidth: 120,
            fontSize: "1rem",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 0.5,
          }}
        >
          {title}
        </Box>
        {actions}
      </Box>
      {hint && (
        <Typography
          variant="caption"
          sx={{
          color: BRAND.muted,
          mb: 0.5,
          display: "block",
          lineHeight: 1.3,
          flexShrink: 0,
          fontSize: "0.7rem",
        }}
        >
          {hint}
        </Typography>
      )}
      <Box
        sx={{
          flex: "1 1 auto",
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          ...bodySx,
        }}
      >
        {children}
      </Box>
    </Paper>
  );
}

/** Avance: completada=100%, resto=0%. Agrupa por key. */
function agregarAvance(list, keyFn, labelFn) {
  const map = new Map();
  for (const a of list) {
    const key = keyFn(a);
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        nombre: labelFn(a),
        id_area: a.id_area,
        id_sub_area: a.id_sub_area,
        area: a.area_nombre || "",
        total: 0,
        suma: 0,
      });
    }
    const row = map.get(key);
    row.total += 1;
    row.suma += valorAvance(a.estado);
  }
  return [...map.values()]
    .map((row) => ({
      ...row,
      avance: row.total > 0 ? Math.round(row.suma / row.total) : 0,
      extra: `${Math.round(row.suma / 100)} / ${row.total} completada(s)`,
    }))
    .sort(
      (a, b) =>
        b.avance - a.avance ||
        String(a.nombre).localeCompare(String(b.nombre), "es"),
    );
}

function calcEficienciaList(list) {
  let sumSi = 0;
  let sumNo = 0;
  let sumTotal = 0;
  for (const a of list) {
    if (String(a.estado).toLowerCase() !== "completada") continue;
    const total = Number(a.total_preguntas) || 0;
    const si = Number(a.respuestas_si) || 0;
    if (total <= 0) continue;
    sumSi += si;
    sumNo += Math.max(0, total - si);
    sumTotal += total;
  }
  const pct = sumTotal > 0 ? Math.round((sumSi / sumTotal) * 100) : null;
  return { pct, sumSi, sumNo, sumTotal };
}

function Dashboard() {
  const router = useRouter();
  const actual = periodoActualParts();
  const rightColRef = React.useRef(null);
  const magicoGridRef = React.useRef(null);
  const [rightColHeight, setRightColHeight] = useState(null);
  const [stats, setStats] = useState({
    areas: 0,
    auditorias: 0,
    pendientes: 0,
  });
  const [auditorias, setAuditorias] = useState([]);
  const [areas, setAreas] = useState([]);
  const [subAreasCat, setSubAreasCat] = useState([]);
  const [filtroArea, setFiltroArea] = useState("");
  const [filtroSubArea, setFiltroSubArea] = useState("");
  const [anio, setAnio] = useState(actual.anio);
  const [mes, setMes] = useState("");
  const [loading, setLoading] = useState(true);
  const [ncItems, setNcItems] = useState([]);
  const [ncTotal, setNcTotal] = useState(0);
  /** Drill desde avance: controla las gráficas circulares */
  const [drillArea, setDrillArea] = useState(null);
  const [drillSubArea, setDrillSubArea] = useState(null);
  const [vistaMagica, setVistaMagica] = useState(false);
  const [ncMagico, setNcMagico] = useState({});
  const [loadingMagico, setLoadingMagico] = useState(false);
  const [exportandoMagico, setExportandoMagico] = useState(false);
  const [detalleNcSub, setDetalleNcSub] = useState(null);
  const [detalleNcItems, setDetalleNcItems] = useState([]);
  const [detalleNcLista, setDetalleNcLista] = useState([]);
  const [loadingDetalleNc, setLoadingDetalleNc] = useState(false);

  const anios = useMemo(() => aniosDisponibles(actual.anio), [actual.anio]);
  const filtrosPeriodoActivos = mes !== "" || anio !== actual.anio;

  const irASeguimiento = useCallback(
    (entry) => {
      if (!entry?.id_area) return;
      const params = new URLSearchParams();
      params.set("id_area", String(entry.id_area));
      if (entry.id_sub_area)
        params.set("id_sub_area", String(entry.id_sub_area));
      router.push(`/dashboard/auditorias/seguimiento?${params.toString()}`);
    },
    [router],
  );

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
        const res = await fetch(`/api/auditorias/no-conformidades?${params}`);
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const audParams = new URLSearchParams();
      appendPeriodoParams(audParams, { anio, mes });
      const [areasRes, audRes] = await Promise.all([
        fetch("/api/areas"),
        fetch(`/api/auditorias?${audParams.toString()}`),
      ]);
      const areasData = await areasRes.json();
      const audData = await audRes.json();
      const list = audData.success ? audData.data || [] : [];
      setAreas(areasData.success ? areasData.data || [] : []);
      setAuditorias(list);
      setStats({
        areas: areasData.success ? (areasData.data || []).length : 0,
        auditorias: list.length,
        pendientes: list.filter((a) =>
          ["pendiente", "en_progreso", "vencida"].includes(
            String(a.estado || "").toLowerCase(),
          ),
        ).length,
      });
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
    setFiltroSubArea("");
    setDrillArea(null);
    setDrillSubArea(null);
    if (!filtroArea) {
      setSubAreasCat([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/sub-areas?id_area=${encodeURIComponent(filtroArea)}`,
        );
        const data = await res.json();
        if (!cancelled) {
          setSubAreasCat(res.ok && data.success ? data.data || [] : []);
        }
      } catch {
        if (!cancelled) setSubAreasCat([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filtroArea]);

  /** Filtro efectivo: dropdowns + drill de avance */
  const idAreaActivo = drillArea?.id_area || filtroArea || "";
  const idSubAreaActivo = drillSubArea?.id_sub_area || filtroSubArea || "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ limit: "12" });
        appendPeriodoParams(params, { anio, mes });
        if (idAreaActivo) params.set("id_area", String(idAreaActivo));
        if (idSubAreaActivo) params.set("id_sub_area", String(idSubAreaActivo));
        const res = await fetch(`/api/auditorias/no-conformidades?${params}`);
        const data = await res.json();
        if (cancelled) return;
        if (res.ok && data.success) {
          setNcItems(data.data?.items || []);
          setNcTotal(data.data?.total || 0);
        } else {
          setNcItems([]);
          setNcTotal(0);
        }
      } catch {
        if (!cancelled) {
          setNcItems([]);
          setNcTotal(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idAreaActivo, idSubAreaActivo, anio, mes]);

  const auditoriasBase = useMemo(() => {
    let list = auditorias;
    if (filtroArea) {
      list = list.filter((a) => String(a.id_area) === String(filtroArea));
    }
    if (filtroSubArea) {
      list = list.filter(
        (a) => String(a.id_sub_area) === String(filtroSubArea),
      );
    }
    return list;
  }, [auditorias, filtroArea, filtroSubArea]);

  const auditoriasCirculares = useMemo(() => {
    let list = auditoriasBase;
    if (drillArea?.id_area) {
      list = list.filter(
        (a) => String(a.id_area) === String(drillArea.id_area),
      );
    }
    if (drillSubArea?.id_sub_area) {
      list = list.filter(
        (a) => String(a.id_sub_area) === String(drillSubArea.id_sub_area),
      );
    }
    return list;
  }, [auditoriasBase, drillArea, drillSubArea]);

  const avancePorArea = useMemo(
    () =>
      agregarAvance(
        auditoriasBase,
        (a) => String(a.id_area),
        (a) => a.area_nombre || `Área ${a.id_area}`,
      ),
    [auditoriasBase],
  );

  const avancePorSubArea = useMemo(() => {
    if (!drillArea?.id_area) return [];
    let list = auditoriasBase.filter(
      (a) => String(a.id_area) === String(drillArea.id_area),
    );
    const rows = agregarAvance(
      list,
      (a) => String(a.id_sub_area),
      (a) => a.sub_area_nombre || `Sub área ${a.id_sub_area}`,
    );
    // Incluir sub áreas del catálogo sin auditorías si hay filtro de área
    if (
      filtroArea &&
      String(filtroArea) === String(drillArea.id_area) &&
      subAreasCat.length
    ) {
      for (const sa of subAreasCat) {
        if (
          !rows.some((r) => String(r.id_sub_area) === String(sa.id_sub_area))
        ) {
          rows.push({
            id: String(sa.id_sub_area),
            nombre: sa.nombre,
            id_area: sa.id_area,
            id_sub_area: sa.id_sub_area,
            area: drillArea.nombre,
            total: 0,
            suma: 0,
            avance: 0,
            extra: "0 / 0 completada(s)",
          });
        }
      }
    }
    return rows.sort(
      (a, b) =>
        b.avance - a.avance ||
        String(a.nombre).localeCompare(String(b.nombre), "es"),
    );
  }, [auditoriasBase, drillArea, filtroArea, subAreasCat]);

  const avanceVista = drillArea ? avancePorSubArea : avancePorArea;

  const avancePromedio = useMemo(() => {
    if (!avanceVista.length) return 0;
    return Math.round(
      avanceVista.reduce((s, r) => s + r.avance, 0) / avanceVista.length,
    );
  }, [avanceVista]);

  const eficienciaStats = useMemo(() => {
    return calcEficienciaList(auditoriasCirculares);
  }, [auditoriasCirculares]);

  /** Panorama completo: cada sub área con título Área - Sub área (vista mágica) */
  const panoramaSubAreas = useMemo(() => {
    const bySub = new Map();
    for (const a of auditorias) {
      const key = String(a.id_sub_area);
      if (!bySub.has(key)) {
        const areaNom = a.area_nombre || `Área ${a.id_area}`;
        const subNom = a.sub_area_nombre || `Sub área ${a.id_sub_area}`;
        bySub.set(key, {
          id_area: a.id_area,
          id_sub_area: a.id_sub_area,
          area_nombre: areaNom,
          sub_area_nombre: subNom,
          titulo: `${areaNom} - ${subNom}`,
          auditorias: [],
        });
      }
      bySub.get(key).auditorias.push(a);
    }
    return [...bySub.values()]
      .map((sub) => {
        const efi = calcEficienciaList(sub.auditorias);
        const avanceRows = agregarAvance(
          sub.auditorias,
          () => String(sub.id_sub_area),
          () => sub.sub_area_nombre,
        );
        const avance = avanceRows[0]?.avance ?? 0;
        return { ...sub, efi, avance };
      })
      .sort((a, b) => String(a.titulo).localeCompare(String(b.titulo), "es"));
  }, [auditorias]);

  useEffect(() => {
    if (!vistaMagica || !panoramaSubAreas.length) return undefined;
    let cancelled = false;
    (async () => {
      setLoadingMagico(true);
      try {
        const entries = await Promise.all(
          panoramaSubAreas.map(async (sub) => {
            const params = new URLSearchParams({
              limit: "8",
              id_area: String(sub.id_area),
              id_sub_area: String(sub.id_sub_area),
            });
            appendPeriodoParams(params, { anio, mes });
            const res = await fetch(
              `/api/auditorias/no-conformidades?${params}`,
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
        if (!cancelled) setNcMagico(Object.fromEntries(entries));
      } catch {
        if (!cancelled) setNcMagico({});
      } finally {
        if (!cancelled) setLoadingMagico(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vistaMagica, panoramaSubAreas, anio, mes]);

  const handleExportarVistaMagica = useCallback(async () => {
    if (!panoramaSubAreas.length || loadingMagico) return;
    const container = magicoGridRef.current;
    if (!container) {
      window.alert("Abra la vista mágica y espere a que carguen las gráficas.");
      return;
    }
    setExportandoMagico(true);
    try {
      const periodoSlug = mes ? `${anio}-${mes}` : String(anio);
      await exportVistaMagicaExcel({
        periodoLabel: labelPeriodo(anio, mes),
        periodoSlug,
        containerEl: container,
      });
    } catch (err) {
      console.error(err);
      window.alert(
        err?.message || "No se pudo generar el Excel. Intente de nuevo.",
      );
    } finally {
      setExportandoMagico(false);
    }
  }, [panoramaSubAreas.length, anio, mes, loadingMagico]);

  useEffect(() => {
    if (loading) return undefined;
    const el = rightColRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height;
      if (h != null && h > 0) setRightColHeight(Math.round(h));
    });
    ro.observe(el);
    setRightColHeight(Math.round(el.getBoundingClientRect().height));
    return () => ro.disconnect();
  }, [
    loading,
    ncItems,
    ncTotal,
    eficienciaStats.pct,
    eficienciaStats.sumTotal,
  ]);

  const onClickAvance = useCallback(
    (entry) => {
      if (!entry) return;
      if (!drillArea) {
        setDrillArea({ id_area: entry.id_area, nombre: entry.nombre });
        setDrillSubArea(null);
        return;
      }
      // Ya en sub áreas: seleccionar filtra circulares; segundo clic en la misma → seguimiento
      if (
        drillSubArea &&
        String(drillSubArea.id_sub_area) === String(entry.id_sub_area)
      ) {
        irASeguimiento(entry);
        return;
      }
      setDrillSubArea({
        id_sub_area: entry.id_sub_area,
        id_area: entry.id_area,
        nombre: entry.nombre,
      });
    },
    [drillArea, drillSubArea, irASeguimiento],
  );

  const volverAvance = () => {
    if (drillSubArea) {
      setDrillSubArea(null);
      return;
    }
    setDrillArea(null);
  };

  const limpiarTodo = () => {
    setAnio(actual.anio);
    setMes("");
    setFiltroArea("");
    setFiltroSubArea("");
    setDrillArea(null);
    setDrillSubArea(null);
  };

  const hayFiltros =
    filtrosPeriodoActivos ||
    !!filtroArea ||
    !!filtroSubArea ||
    !!drillArea ||
    !!drillSubArea;

  const etiquetaFiltroCirculares = drillSubArea
    ? `${drillArea?.nombre || ""} · ${drillSubArea.nombre}`
    : drillArea
      ? drillArea.nombre
      : filtroSubArea
        ? "Filtro de sub área"
        : filtroArea
          ? areas.find((a) => String(a.id_area) === String(filtroArea))
              ?.nombre || "Área"
          : "Todas las áreas";

  return (
    <DashboardShell selectedItemId="inicio">
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: BRAND.primary }} />
          </Box>
        ) : (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                gap: 1,
                mb: 1,
              }}
            >
              <StatCard
                icon={Business}
                label="Áreas activas"
                value={stats.areas}
                color={BRAND.primary}
              />
              <StatCard
                icon={FactCheck}
                label={mes ? "Auditorías del mes" : "Auditorías del periodo"}
                value={stats.auditorias}
                color={BRAND.primaryDark}
              />
              <StatCard
                icon={Assignment}
                label="Pendientes"
                value={stats.pendientes}
                color={BRAND.primaryLight}
              />
            </Box>

            <Paper
              sx={{
                p: 1,
                mb: 1,
                borderRadius: 1,
                border: `1px solid ${BRAND.border}`,
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                alignItems: "center",
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: BRAND.muted, fontWeight: 700, mr: 0.5 }}
              >
                Filtros
              </Typography>
              <TextField
                select
                label="Año"
                size="small"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                sx={{ minWidth: 110 }}
              >
                {anios.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Mes"
                size="small"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">Todos</MenuItem>
                {MESES.map((m) => (
                  <MenuItem key={m.value} value={m.value}>
                    {m.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Área"
                size="small"
                value={filtroArea}
                onChange={(e) => setFiltroArea(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">Todas</MenuItem>
                {areas.map((a) => (
                  <MenuItem key={a.id_area} value={String(a.id_area)}>
                    {a.nombre}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Sub área"
                size="small"
                value={filtroSubArea}
                onChange={(e) => setFiltroSubArea(e.target.value)}
                disabled={!filtroArea}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">Todas</MenuItem>
                {subAreasCat.map((sa) => (
                  <MenuItem key={sa.id_sub_area} value={String(sa.id_sub_area)}>
                    {sa.nombre}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                size="small"
                variant="outlined"
                startIcon={<FilterAltOff />}
                disabled={!hayFiltros}
                onClick={limpiarTodo}
                sx={{ textTransform: "none" }}
              >
                Limpiar
              </Button>
              <Typography
                variant="caption"
                sx={{
                  color: BRAND.muted,
                  fontWeight: 600,
                  width: { xs: "100%", sm: "auto" },
                  ml: { sm: "auto" },
                }}
              >
                Periodo: {labelPeriodo(anio, mes)}
              </Typography>
              <Button
                size="small"
                variant="contained"
                startIcon={<AutoAwesome />}
                onClick={() => setVistaMagica(true)}
                sx={{
                  textTransform: "none",
                  bgcolor: BRAND.primary,
                  boxShadow: `0 4px 14px ${BRAND.glow}`,
                  "&:hover": { bgcolor: BRAND.primaryDark },
                }}
              >
                Ver graficas
              </Button>
            </Paper>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" },
                gap: 1,
                alignItems: "start",
                mb: 1,
                // Encaja stats+filtros+gráficas en viewport ~100% zoom
                maxHeight: { md: "calc(100vh - 150px)" },
              }}
            >
              <ChartSection
                sx={{
                  mb: 0,
                  height: {
                    xs: "auto",
                    md: rightColHeight ? `${rightColHeight}px` : "auto",
                  },
                  width: "100%",
                  overflow: "hidden",
                }}
                bodySx={{
                  flex: "1 1 auto",
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  overflowY: "auto",
                  overflowX: "hidden",
                }}
                title={
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    Avance
                    <Typography
                      component="span"
                      sx={{
                        fontWeight: 800,
                        color: colorBarra(avancePromedio),
                        fontSize: "1rem",
                      }}
                    >
                      {avancePromedio}%
                    </Typography>
                    {drillArea && (
                      <Typography
                        component="span"
                        sx={{
                          color: BRAND.muted,
                          fontWeight: 600,
                          fontSize: "0.85rem",
                        }}
                      >
                        · {drillArea.nombre}
                        {drillSubArea ? ` · ${drillSubArea.nombre}` : ""}
                      </Typography>
                    )}
                  </Box>
                }
                hint={
                  drillArea
                    ? drillSubArea
                      ? "Sub área seleccionada filtra las circulares. Clic de nuevo → seguimiento."
                      : "Clic en una sub área para filtrar eficiencia y NC."
                    : "Clic en un área para ver sub áreas y filtrar las gráficas circulares."
                }
                actions={
                  drillArea ? (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<ArrowBack />}
                      onClick={volverAvance}
                      sx={{ textTransform: "none" }}
                    >
                      {drillSubArea ? "Sub áreas" : "Áreas"}
                    </Button>
                  ) : null
                }
              >
                {avanceVista.length === 0 ? (
                  <Box sx={{ py: 4, textAlign: "center", color: BRAND.muted }}>
                    No hay auditorías para graficar
                  </Box>
                ) : (
                  <Box
                    sx={{
                      borderRadius: 1,
                      border: `1px solid ${BRAND.border}`,
                      px: 1,
                      py: 0.75,
                      flex: 1,
                      minHeight: 200,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 800,
                        color: BRAND.ink,
                        fontSize: "0.8rem",
                        mb: 0.5,
                        flexShrink: 0,
                      }}
                    >
                      {drillArea ? "Por sub área" : "Por área"}
                    </Typography>
                    <HorizontalPctChart
                      data={avanceVista}
                      dataKey="avance"
                      tooltipLabel="Avance"
                      onBarClick={onClickAvance}
                      yWidth={110}
                      showXAxis
                      fillContainer
                      rowKey="id"
                      selectedId={
                        drillSubArea
                          ? String(drillSubArea.id_sub_area)
                          : drillArea
                            ? String(drillArea.id_area)
                            : null
                      }
                      getFill={(entry) => colorBarra(entry.avance)}
                    />
                  </Box>
                )}
              </ChartSection>

              <Box
                ref={rightColRef}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  minWidth: 0,
                  maxHeight: { md: "100%" },
                }}
              >
                <ChartSection
                  sx={{ mb: 0, flex: 1, minHeight: 0 }}
                  title={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Speed sx={{ color: BRAND.primary, fontSize: 18 }} />
                      Eficiencia
                      {eficienciaStats.pct != null && (
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: 800,
                            color: colorBarra(eficienciaStats.pct),
                            fontSize: "0.9rem",
                          }}
                        >
                          {eficienciaStats.pct}%
                        </Typography>
                      )}
                    </Box>
                  }
                  hint={`Cumple vs no cumple · ${etiquetaFiltroCirculares}`}
                >
                  {eficienciaStats.sumTotal === 0 ? (
                    <Box
                      sx={{
                        py: 2,
                        textAlign: "center",
                        color: BRAND.muted,
                        fontSize: 13,
                      }}
                    >
                      Sin auditorías completadas en este filtro
                    </Box>
                  ) : (
                    <EficienciaPie
                      pct={eficienciaStats.pct}
                      sumSi={eficienciaStats.sumSi}
                      sumNo={eficienciaStats.sumNo}
                      height={150}
                    />
                  )}
                </ChartSection>

                <ChartSection
                  sx={{ mb: 0, flex: 1, minHeight: 0 }}
                  title={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <ReportProblem sx={{ color: "#C62828", fontSize: 18 }} />
                      No conformidades
                      {ncTotal > 0 && (
                        <Typography
                          component="span"
                          sx={{
                            fontWeight: 700,
                            color: BRAND.muted,
                            fontSize: "0.85rem",
                          }}
                        >
                          {ncTotal}
                        </Typography>
                      )}
                    </Box>
                  }
                  hint={`Gráfica NC · tipos y cantidades · ${etiquetaFiltroCirculares}`}
                >
                  {ncItems.length === 0 ? (
                    <Box
                      sx={{
                        py: 2,
                        textAlign: "center",
                        color: BRAND.muted,
                        fontSize: 13,
                      }}
                    >
                      No hay NC en este filtro
                    </Box>
                  ) : (
                    <Box>
                      <NcPieChart data={ncItems} height={150} hideLegend />
                      <NcTipoList items={ncItems} />
                    </Box>
                  )}
                </ChartSection>
              </Box>
            </Box>
          </>
        )}

        <Dialog
          open={vistaMagica}
          onClose={() => setVistaMagica(false)}
          fullWidth
          maxWidth="xl"
          scroll="paper"
          slotProps={{
            paper: {
              sx: {
                borderRadius: 1,
                maxHeight: "92vh",
              },
            },
          }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              pr: 1,
              borderBottom: `1px solid ${BRAND.border}`,
            }}
          >
            <AutoAwesome sx={{ color: BRAND.primary }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{ fontWeight: 800, color: BRAND.ink, lineHeight: 1.2 }}
              >
                Todas las sub áreas
              </Typography>
              <Typography variant="caption" sx={{ color: BRAND.muted }}>
                Clic en una tarjeta con NC para ver tipos, pregunta y hallazgo
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              startIcon={
                exportandoMagico ? (
                  <CircularProgress size={14} />
                ) : (
                  <FileDownload />
                )
              }
              disabled={
                exportandoMagico ||
                loadingMagico ||
                panoramaSubAreas.length === 0
              }
              onClick={handleExportarVistaMagica}
              sx={{ textTransform: "none", fontWeight: 600, flexShrink: 0 }}
            >
              {exportandoMagico ? "Exportando…" : "Descargar Excel"}
            </Button>
            <IconButton
              aria-label="Cerrar"
              onClick={() => setVistaMagica(false)}
            >
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ bgcolor: BRAND.bg, p: { xs: 1, sm: 1.5 } }}>
            {loadingMagico && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 1.5 }}>
                <CircularProgress size={24} sx={{ color: BRAND.primary }} />
              </Box>
            )}
            {panoramaSubAreas.length === 0 ? (
              <Box sx={{ py: 6, textAlign: "center", color: BRAND.muted }}>
                No hay auditorías para mostrar
              </Box>
            ) : (
              <Box
                ref={magicoGridRef}
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1fr",
                    md: "1fr 1fr 1fr",
                    lg: "1fr 1fr 1fr 1fr",
                  },
                  gap: 1,
                  pt: 0.5,
                }}
              >
                {panoramaSubAreas.map((sub) => {
                  const nc = ncMagico[String(sub.id_sub_area)] || {
                    items: [],
                    total: 0,
                  };
                  const tieneNc = nc.total > 0;
                  return (
                    <Paper
                      key={sub.id_sub_area}
                      data-vista-magica-export={String(sub.id_sub_area)}
                      onClick={() => {
                        if (tieneNc) abrirDetalleNc(sub, nc);
                      }}
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        border: `1px solid ${BRAND.border}`,
                        cursor: tieneNc ? "pointer" : "default",
                        transition: "border-color 0.15s, box-shadow 0.15s",
                        "&:hover": tieneNc
                          ? {
                              borderColor: BRAND.primary,
                              boxShadow: `0 0 0 1px ${BRAND.primary}`,
                            }
                          : undefined,
                      }}
                    >
                      <Typography
                        title={sub.titulo}
                        noWrap
                        sx={{
                          fontWeight: 800,
                          color: BRAND.ink,
                          fontSize: "0.78rem",
                          lineHeight: 1.2,
                          mb: 0.25,
                        }}
                      >
                        {sub.titulo}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: BRAND.muted,
                          fontWeight: 700,
                          fontSize: "0.68rem",
                          display: "block",
                          mb: 0.75,
                        }}
                      >
                        Av {sub.avance}%
                        {sub.efi.pct != null ? ` · Efi ${sub.efi.pct}%` : ""}
                        {nc.total > 0 ? ` · ${nc.total} NC` : ""}
                        {tieneNc ? " · ver detalle" : ""}
                      </Typography>

                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 0.75,
                          alignItems: "start",
                        }}
                      >
                        <Box
                          sx={{
                            borderRadius: 1,
                            border: `1px solid ${BRAND.border}`,
                            px: 0.5,
                            py: 0.5,
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.62rem",
                              color: BRAND.muted,
                              mb: 0.25,
                              textTransform: "uppercase",
                              letterSpacing: 0.2,
                            }}
                          >
                            Eficiencia
                          </Typography>
                          {sub.efi.sumTotal === 0 ? (
                            <Box
                              sx={{
                                py: 2,
                                textAlign: "center",
                                color: BRAND.muted,
                                fontSize: 11,
                              }}
                            >
                              —
                            </Box>
                          ) : (
                            <EficienciaPie
                              pct={sub.efi.pct}
                              sumSi={sub.efi.sumSi}
                              sumNo={sub.efi.sumNo}
                              height={118}
                              hideLegend
                            />
                          )}
                        </Box>

                        <Box
                          sx={{
                            borderRadius: 1,
                            border: `1px solid ${BRAND.border}`,
                            px: 0.5,
                            py: 0.5,
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: 800,
                              fontSize: "0.62rem",
                              color: BRAND.muted,
                              mb: 0.25,
                              textTransform: "uppercase",
                              letterSpacing: 0.2,
                            }}
                          >
                            NC{nc.total > 0 ? ` (${nc.total})` : ""}
                          </Typography>
                          {nc.items.length === 0 ? (
                            <Box
                              sx={{
                                py: 2,
                                textAlign: "center",
                                color: BRAND.muted,
                                fontSize: 11,
                              }}
                            >
                              —
                            </Box>
                          ) : (
                            <NcPieChart
                              data={nc.items}
                              height={118}
                              hideLegend
                            />
                          )}
                        </Box>
                      </Box>

                      {nc.items.length > 0 && (
                        <NcTipoList items={nc.items} dense max={4} />
                      )}
                    </Paper>
                  );
                })}
              </Box>
            )}
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(detalleNcSub)}
          onClose={cerrarDetalleNc}
          fullWidth
          maxWidth="md"
          scroll="paper"
          slotProps={{
            paper: {
              sx: { borderRadius: 1, maxHeight: "90vh" },
            },
          }}
        >
          <DialogTitle
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              pr: 1,
              borderBottom: `1px solid ${BRAND.border}`,
            }}
          >
            <ReportProblem sx={{ color: "#C62828" }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, color: BRAND.ink, lineHeight: 1.2 }}>
                Detalle de NC
              </Typography>
              <Typography variant="caption" sx={{ color: BRAND.muted }}>
                {detalleNcSub?.titulo || ""}
              </Typography>
            </Box>
            <IconButton aria-label="Cerrar" onClick={cerrarDetalleNc}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ bgcolor: BRAND.bg, p: { xs: 1.5, sm: 2 } }}>
            {loadingDetalleNc ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={28} sx={{ color: BRAND.primary }} />
              </Box>
            ) : (
              <>
                <Box sx={{ mb: 2 }}>
                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: "0.85rem",
                      color: BRAND.ink,
                      mb: 1,
                    }}
                  >
                    Por tipo ({detalleNcItems.reduce((s, i) => s + (i.total || 0), 0)} NC)
                  </Typography>
                  {detalleNcItems.length === 0 ? (
                    <Typography sx={{ color: BRAND.muted, fontSize: 13 }}>
                      Sin no conformidades
                    </Typography>
                  ) : (
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "1fr",
                          sm: "1fr 1fr",
                        },
                        gap: 1,
                      }}
                    >
                      {detalleNcItems.map((item, i) => (
                        <Paper
                          key={item.id_tipo_nc}
                          sx={{
                            p: 1.25,
                            borderRadius: 1,
                            border: `1px solid ${BRAND.border}`,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          }}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: 0.5,
                              bgcolor: NC_COLORS[i % NC_COLORS.length],
                              flexShrink: 0,
                            }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              noWrap
                              sx={{ fontWeight: 700, fontSize: "0.8rem" }}
                            >
                              {item.nombre}
                            </Typography>
                            <Typography
                              sx={{
                                color: BRAND.muted,
                                fontSize: "0.7rem",
                                fontWeight: 600,
                              }}
                            >
                              {item.total} ({item.porcentaje}%)
                            </Typography>
                          </Box>
                        </Paper>
                      ))}
                    </Box>
                  )}
                </Box>

                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.85rem",
                    color: BRAND.ink,
                    mb: 1,
                  }}
                >
                  Hallazgos
                </Typography>
                {detalleNcLista.length === 0 ? (
                  <Typography sx={{ color: BRAND.muted, fontSize: 13 }}>
                    No hay detalle de hallazgos registrado
                  </Typography>
                ) : (
                  <TableContainer component={Paper} sx={{ ...tablePaperSx, maxHeight: 360 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={tableHeadRowSx}>
                          <TableCell sx={tableHeadCellSx}>Tipo NC</TableCell>
                          <TableCell sx={tableHeadCellSx}>Pregunta</TableCell>
                          <TableCell sx={tableHeadCellSx}>Hallazgo</TableCell>
                          <TableCell sx={tableHeadCellSx}>Turno</TableCell>
                          <TableCell sx={tableHeadCellSx}>Auditor</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detalleNcLista.map((d) => (
                          <TableRow
                            key={d.id_respuesta}
                            hover
                            sx={{ cursor: "pointer" }}
                            onClick={() =>
                              router.push(
                                `/dashboard/auditorias/${d.id_auditoria}`,
                              )
                            }
                          >
                            <TableCell>
                              <Chip
                                size="small"
                                label={d.tipo_nc_nombre}
                                sx={{
                                  fontWeight: 700,
                                  bgcolor: "rgba(198,40,40,0.1)",
                                  color: "#C62828",
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ maxWidth: 220 }}>
                              <Typography
                                title={d.pregunta_texto}
                                sx={{
                                  fontSize: "0.78rem",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {d.pregunta_texto || "—"}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ maxWidth: 220 }}>
                              <Typography
                                title={d.hallazgo}
                                sx={{
                                  fontSize: "0.78rem",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {d.hallazgo || "—"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={`Turno ${d.turno || "—"}`}
                                sx={{ fontWeight: 700 }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontSize: "0.78rem" }}>
                              {d.emp_nombre || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </Box>
    </DashboardShell>
  );
}

export default Dashboard;
