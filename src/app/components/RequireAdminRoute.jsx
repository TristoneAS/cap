"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import { NON_ADMIN_HOME } from "@/libs/dashboard_access";
import { BRAND } from "@/libs/theme_palette";

function RequireAdminRoute({ children }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    const admin = localStorage.getItem("isAdmin") === "true";
    if (!admin) {
      router.replace(NON_ADMIN_HOME);
      setAllowed(false);
      return;
    }
    setAllowed(true);
  }, [router]);

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

export default RequireAdminRoute;
