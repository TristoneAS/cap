"use client";

import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { BRAND } from "@/libs/theme_palette";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: BRAND.primary,
      dark: BRAND.primaryDark,
      light: BRAND.primaryLight,
      contrastText: "#ffffff",
    },
    secondary: {
      main: BRAND.navy,
      contrastText: "#ffffff",
    },
    warning: {
      main: "#ED6C02",
      contrastText: "#ffffff",
    },
    success: {
      main: "#2E7D32",
      contrastText: "#ffffff",
    },
    background: {
      default: BRAND.bg,
      paper: BRAND.paper,
    },
    text: {
      primary: BRAND.ink,
      secondary: BRAND.muted,
    },
    divider: BRAND.border,
    error: { main: "#D32F2F" },
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily:
      'var(--font-roboto, "Roboto", "Helvetica", "Arial", sans-serif)',
    h4: { fontWeight: 800, color: BRAND.ink },
    h5: { fontWeight: 800, color: BRAND.ink },
    h6: { fontWeight: 700, color: BRAND.ink },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: BRAND.bg,
          color: BRAND.ink,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          background: `linear-gradient(135deg, ${BRAND.primaryDark} 0%, ${BRAND.primary} 100%)`,
          color: "#ffffff",
          boxShadow: `0 6px 16px ${BRAND.glow}`,
          "&:hover": {
            background: `linear-gradient(135deg, ${BRAND.primaryDeep} 0%, ${BRAND.primaryDark} 100%)`,
            boxShadow: `0 8px 20px ${BRAND.glow}`,
          },
        },
        outlinedPrimary: {
          borderColor: "rgba(25, 118, 210, 0.45)",
          color: BRAND.primaryDark,
          "&:hover": {
            borderColor: BRAND.primary,
            backgroundColor: BRAND.hover,
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        autoComplete: "off",
        slotProps: {
          htmlInput: { autoComplete: "off" },
        },
      },
    },
    MuiOutlinedInput: {
      defaultProps: { autoComplete: "off" },
    },
    MuiSelect: {
      defaultProps: { autoComplete: "off" },
    },
  },
});

export default function MuiAppThemeProvider({ children }) {
  return (
    <AppRouterCacheProvider options={{ key: "mui", prepend: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
