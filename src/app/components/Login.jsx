"use client";

import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Divider,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Person,
  Lock,
  FactCheck,
  Rule,
  VerifiedUser,
  ArrowForward,
} from "@mui/icons-material";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { getPostLoginRedirect } from "@/libs/dashboard_access";
import {
  getSessionExpiresAt,
  setSessionCookieClient,
} from "@/libs/auth_session";
import { BRAND } from "@/libs/theme_palette";

const LPA_STEPS = [
  {
    icon: FactCheck,
    label: "Programar",
    detail: "Checklist LPA por línea y turno",
    status: "Pendiente",
  },
  {
    icon: Rule,
    label: "Auditar",
    detail: "Verificación en piso y hallazgos",
    status: "En curso",
  },
  {
    icon: VerifiedUser,
    label: "Cerrar",
    detail: "Conformidad y seguimiento CAP",
    status: "Conforme",
  },
];

function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState({ user: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (user.user === "" || user.password === "") {
      setSnackbarMessage("Favor de llenar todos los campos");
      setSnackbarSeverity("warning");
      setOpenSnackbar(true);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_AUTH_SERVER_URL}/SYSTEMVDOCS/AUTHENTICATE`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: user.user.trim(),
            password: user.password,
          }),
        },
      );

      const data = await response.json();

      if (response.ok && data.authorization !== "Unauthorized") {
        try {
          const empleadoResponse = await fetch(
            `/api/empleados/by-alias/${user.user.trim()}`,
          );
          const empleadoData = await empleadoResponse.json();

          if (empleadoResponse.ok && empleadoData.success) {
            localStorage.setItem("infoUser", JSON.stringify(empleadoData.data));
            setSnackbarMessage("Iniciando sesión en auditorías LPA");
            setSnackbarSeverity("success");
            setOpenSnackbar(true);
            localStorage.setItem("user", JSON.stringify(data));
            localStorage.setItem("isAuthenticated", "true");
            const adminFlag =
              data.isAdmin === true ||
              data.isAdmin === "true" ||
              data.isAdmin === 1;
            localStorage.setItem("isAdmin", adminFlag ? "true" : "false");
            localStorage.setItem("usuario", user.user.trim());
            try {
              const expiresAt = getSessionExpiresAt();
              localStorage.setItem("sessionExpiresAt", expiresAt.toString());
              setSessionCookieClient(expiresAt);
            } catch (err) {
              console.error("No se pudo crear la cookie de sesión:", err);
            }
            const dest = getPostLoginRedirect(
              searchParams.get("redirect"),
              adminFlag,
            );
            setTimeout(() => router.replace(dest), 300);
          } else {
            setSnackbarMessage("El alias del empleado no está registrado");
            setLoading(false);
            setSnackbarSeverity("error");
            setOpenSnackbar(true);
          }
        } catch (error) {
          console.error("Error al obtener información del empleado:", error);
          setSnackbarMessage("El alias del empleado no está registrado");
          setLoading(false);
          setSnackbarSeverity("error");
          setOpenSnackbar(true);
        }
      } else {
        setSnackbarMessage(
          "Error en autenticación: " +
            (data.message || "Credenciales inválidas"),
        );
        setLoading(false);
        setSnackbarSeverity("error");
        setOpenSnackbar(true);
      }
    } catch {
      setSnackbarMessage(
        "Error al conectar con el servidor, contacte a soporte",
      );
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit(e);
  };

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 1,
      bgcolor: "#FFFFFF",
      transition: "box-shadow 0.2s ease, border-color 0.2s ease",
      "& fieldset": { borderColor: BRAND.border },
      "&:hover fieldset": { borderColor: BRAND.primary },
      "&.Mui-focused fieldset": {
        borderColor: BRAND.primaryDark,
        borderWidth: 2,
      },
      "&.Mui-focused": {
        boxShadow: `0 0 0 4px ${BRAND.glow}`,
      },
    },
    "& .MuiInputLabel-root.Mui-focused": { color: BRAND.primaryDark },
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        bgcolor: BRAND.bg,
      }}
    >
      <Box
        sx={{
          flex: { md: "1 1 52%" },
          position: "relative",
          overflow: "hidden",
          bgcolor: BRAND.navy,
          color: BRAND.paper,
          px: { xs: 3, sm: 5, md: 6 },
          py: { xs: 5, md: 0 },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minHeight: { xs: "auto", md: "100vh" },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: `
              radial-gradient(circle at 15% 20%, ${BRAND.glow} 0%, transparent 42%),
              radial-gradient(circle at 85% 75%, rgba(66, 165, 245, 0.14) 0%, transparent 38%),
              linear-gradient(145deg, ${BRAND.navy} 0%, ${BRAND.navySoft} 55%, ${BRAND.navy} 100%)
            `,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 260,
            height: 260,
            borderRadius: "50%",
            border: `2px dashed ${BRAND.border}`,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -40,
            left: -40,
            width: 180,
            height: 180,
            borderRadius: "24px",
            transform: "rotate(18deg)",
            bgcolor: BRAND.hover,
            border: `1px solid ${BRAND.border}`,
          }}
        />

        <Box sx={{ position: "relative", zIndex: 1, maxWidth: 520 }}>
          <Box
            sx={{
              width: { xs: 220, sm: 280 },
              height: { xs: 142, sm: 181 },
              position: "relative",
              mb: 3,
            }}
          >
            <Image
              src="/tristone_logo_head.png"
              alt="Tristone"
              fill
              sizes="(max-width: 600px) 220px, 280px"
              style={{ objectFit: "contain", objectPosition: "left center" }}
              priority
            />
          </Box>

          <Chip
            label="Layered Process Audit"
            size="small"
            sx={{
              mb: 3,
              bgcolor: BRAND.hover,
              color: BRAND.primaryLight,
              fontWeight: 600,
              letterSpacing: 0.6,
              border: `1px solid ${BRAND.border}`,
            }}
          />

          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "2.4rem", sm: "3rem", md: "3.4rem" },
              lineHeight: 1.05,
              mb: 1.5,
              background: `linear-gradient(90deg, #FFFFFF 0%, ${BRAND.primaryLight} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            CAP
          </Typography>
          <Typography
            sx={{
              color: "rgba(255, 248, 240, 0.72)",
              fontSize: { xs: "1rem", md: "1.15rem" },
              mb: 4,
              maxWidth: 420,
              lineHeight: 1.6,
            }}
          >
            Control, auditoría y seguimiento de procesos en planta con enfoque
            LPA.
          </Typography>

          <Stack spacing={0} sx={{ display: { xs: "none", sm: "flex" } }}>
            {LPA_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === LPA_STEPS.length - 1;
              return (
                <Box key={step.label} sx={{ display: "flex", gap: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "12px",
                        display: "grid",
                        placeItems: "center",
                        bgcolor: BRAND.hover,
                        border: `1px solid ${BRAND.border}`,
                        color: BRAND.primaryLight,
                      }}
                    >
                      <Icon fontSize="small" />
                    </Box>
                    {!isLast && (
                      <Box
                        sx={{
                          width: 2,
                          flex: 1,
                          minHeight: 28,
                          my: 0.5,
                          bgcolor: BRAND.border,
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={{ pb: isLast ? 0 : 2.5, pt: 0.5 }}>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        color: "#FFF",
                        fontSize: "0.95rem",
                      }}
                    >
                      {step.label}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(255,248,240,0.6)", mt: 0.3 }}
                    >
                      {step.detail}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: BRAND.primaryLight,
                        fontWeight: 600,
                        mt: 0.5,
                        display: "block",
                      }}
                    >
                      {step.status}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Box>

      <Box
        sx={{
          flex: { md: "1 1 48%" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: { xs: 2.5, sm: 4, md: 6 },
          py: { xs: 4, md: 6 },
          position: "relative",
          bgcolor: BRAND.bg,
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: 6,
            background: `linear-gradient(90deg, ${BRAND.primaryDark}, ${BRAND.primary}, ${BRAND.primaryLight})`,
          },
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 420,
            p: { xs: 3, sm: 4 },
            borderRadius: 1,
            bgcolor: "#FFFFFF",
            boxShadow: `0 24px 60px ${BRAND.glow}, 0 4px 16px rgba(26, 35, 50, 0.06)`,
            border: `1px solid ${BRAND.border}`,
          }}
        >
          <Box sx={{ textAlign: "center", mb: 3.5 }}>
            <Box
              sx={{
                mx: "auto",
                mb: 2,
                width: 200,
                height: 130,
                position: "relative",
              }}
            >
              <Image
                src="/tristone_logo_head2.png"
                alt="Tristone"
                fill
                sizes="200px"
                style={{ objectFit: "contain", objectPosition: "center" }}
                priority
              />
            </Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: BRAND.ink,
                letterSpacing: 0.5,
              }}
            >
              Bienvenido
            </Typography>
            <Typography variant="body2" sx={{ color: BRAND.muted, mt: 0.5 }}>
              Ingresa con tu usuario de Tristone
            </Typography>
          </Box>

          <Divider
            sx={{
              mb: 3,
              borderColor: BRAND.border,
              "&::before, &::after": { borderColor: BRAND.border },
            }}
          >
            <Typography variant="caption" sx={{ color: BRAND.muted, px: 1 }}>
              Acceso seguro
            </Typography>
          </Divider>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Usuario"
              name="user"
              value={user.user}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              required
              disabled={loading}
              sx={{ ...fieldSx, mb: 2.5 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person sx={{ color: BRAND.primary }} />
                    </InputAdornment>
                  ),
                },
                htmlInput: { autoComplete: "username" },
              }}
            />

            <TextField
              fullWidth
              label="Contraseña"
              name="password"
              value={user.password}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              type={showPassword ? "text" : "password"}
              required
              disabled={loading}
              sx={{ ...fieldSx, mb: 3 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: BRAND.primary }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={loading}
                        sx={{ color: BRAND.primary }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
                htmlInput: { autoComplete: "current-password" },
              }}
            />

            <Button
              type="submit"
              fullWidth
              disabled={loading}
              endIcon={!loading && <ArrowForward />}
              sx={{
                py: 1.6,
                borderRadius: 1,
                fontWeight: 700,
                fontSize: "1rem",
                textTransform: "none",
                color: "#FFFFFF",
                background: `linear-gradient(135deg, ${BRAND.primaryDark} 0%, ${BRAND.primary} 55%, ${BRAND.primaryLight} 140%)`,
                boxShadow: `0 8px 24px ${BRAND.glow}`,
                "&:hover": {
                  background: `linear-gradient(135deg, ${BRAND.primaryDeep} 0%, ${BRAND.primaryDark} 50%, ${BRAND.primary} 120%)`,
                  boxShadow: `0 12px 28px ${BRAND.glow}`,
                },
                "&:disabled": {
                  background: "#E0E0E0",
                  color: "#9E9E9E",
                  boxShadow: "none",
                },
              }}
            >
              {loading ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={20} sx={{ color: "#FFFFFF" }} />
                  Iniciando sesión...
                </Box>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </Box>

          <Typography
            variant="caption"
            sx={{
              display: "block",
              textAlign: "center",
              mt: 3,
              color: BRAND.muted,
            }}
          >
            Auditorías LPA · Tristone Flowtech
          </Typography>
        </Box>
      </Box>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setOpenSnackbar(false)}
          severity={snackbarSeverity}
          variant="filled"
          sx={{
            width: "100%",
            borderRadius: "12px",
            ...(snackbarSeverity === "success" && {
              bgcolor: BRAND.primaryDark,
            }),
            ...(snackbarSeverity === "warning" && {
              bgcolor: BRAND.primary,
            }),
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Login;
