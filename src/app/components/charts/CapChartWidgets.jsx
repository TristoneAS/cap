"use client";

import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { BRAND } from "@/libs/theme_palette";

export function colorBarra(pct) {
  if (pct >= 90) return "#2E7D32";
  if (pct >= 70) return BRAND.primary;
  if (pct >= 50) return BRAND.primaryLight;
  if (pct > 0) return "#EF6C00";
  return "#90A4AE";
}

export const NC_COLORS = [
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

export function EficienciaPie({ pct, sumSi, sumNo, height = 250, hideLegend = false }) {
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

export function NcPieChart({ data, height = 250, hideLegend = false }) {
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
export function NcTipoList({ items, dense = false, max = 6, showTitle = true }) {
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

export function ChartSection({ title, hint, children, actions, sx, bodySx }) {
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



export function calcEficienciaListPoka(list) {
  let sumSi = 0;
  let sumNo = 0;
  let sumTotal = 0;
  for (const a of list) {
    if (String(a.estado).toLowerCase() !== "completada") continue;
    if (a.poka_exenta !== "no") continue;
    const total = Number(a.poka_total_preguntas) || 0;
    const si = Number(a.poka_respuestas_si) || 0;
    if (total <= 0) continue;
    sumSi += si;
    sumNo += Math.max(0, total - si);
    sumTotal += total;
  }
  const pct = sumTotal > 0 ? Math.round((sumSi / sumTotal) * 100) : null;
  return { pct, sumSi, sumNo, sumTotal };
}
