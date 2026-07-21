import { BRAND } from "@/libs/theme_palette";

/** Ancho máximo de pantallas con tablas (referencia: seguimiento de auditorías). */
export const PAGE_MAX_WIDTH = 1300;

export const pageTitleSx = {
  fontWeight: 800,
  color: BRAND.ink,
  mb: 0.5,
};

export const pageSubtitleSx = {
  color: BRAND.muted,
  mb: 3,
};

export const tablePaperSx = {
  borderRadius: 1,
  overflow: "hidden",
};

export const tableToolbarSx = {
  px: 2,
  py: 1.25,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 1,
  borderBottom: `1px solid ${BRAND.border}`,
  bgcolor: BRAND.paper,
};

export const tableHeadRowSx = {
  bgcolor: BRAND.soft,
};

export const tableHeadCellSx = {
  fontWeight: 700,
};

export const tableEmptyCellSx = {
  py: 4,
  color: BRAND.muted,
};
