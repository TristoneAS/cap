"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import {
  canAccessDashboardPath,
  getCapAccessClient,
  resolveDeniedRedirect,
} from "@/libs/dashboard_access";
import { defaultHomeForAccess } from "@/libs/cap_roles";
import { BRAND } from "@/libs/theme_palette";

/**
 * Bloquea rutas según capAccess en localStorage (p. ej. Mant vs Procesos).
 */
export default function RequireCapAccess({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    const access = getCapAccessClient();
    if (canAccessDashboardPath(pathname, access)) {
      setAllowed(true);
      return;
    }
    const dest =
      resolveDeniedRedirect(pathname, access) ??
      defaultHomeForAccess(access, access.canCalidadAdmin);
    router.replace(dest);
    setAllowed(false);
  }, [pathname, router]);

  if (allowed === false) return null;
  if (allowed !== true) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress sx={{ color: BRAND.primary }} />
      </Box>
    );
  }
  return children;
}
