"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
  CircularProgress,
} from "@mui/material";
import {
  Home,
  Settings,
  ExpandLess,
  ExpandMore,
  Logout,
  Business,
  AccountTree,
  FactCheck,
  Quiz,
  ReportProblem,
  PlaylistAddCheck,
  Assignment,
  AutoMode,
  People,
  Layers,
  Groups,
} from "@mui/icons-material";
import { useRouter, usePathname } from "next/navigation";
import {
  clearAuthStorageClient,
  isAuthenticatedClient,
  syncSessionCookieFromStorage,
} from "@/libs/auth_session";
import {
  isAdminOnlyDashboardPath,
  NON_ADMIN_HOME,
} from "@/libs/dashboard_access";
import UsuarioBloqueadoModal from "./UsuarioBloqueadoModal";
import { BRAND } from "@/libs/theme_palette";

function getMiEmpId() {
  try {
    const raw = localStorage.getItem("infoUser");
    if (!raw) return "";
    const u = JSON.parse(raw);
    return u?.emp_id != null ? String(u.emp_id).trim() : "";
  } catch {
    return "";
  }
}

const drawerWidth = 260;

function buildMenuItems(isAdmin) {
  const configuracion = {
    id: "configuracion",
    title: "Configuración",
    icon: Settings,
    description: "Siga el orden del menú al capturar",
    hasSubmenu: true,
    adminOnly: true,
    submenu: [
      {
        id: "niveles",
        title: "1. Niveles",
        icon: Layers,
        route: "/dashboard/catalogos/niveles",
      },
      {
        id: "usuarios",
        title: "2. Usuarios",
        icon: People,
        route: "/dashboard/usuarios",
      },
      {
        id: "areas",
        title: "3. Áreas",
        icon: Business,
        route: "/dashboard/catalogos/areas",
      },
      {
        id: "sub-areas",
        title: "4. Sub áreas",
        icon: AccountTree,
        route: "/dashboard/catalogos/sub-areas",
      },
      {
        id: "tipos-nc",
        title: "5. Tipos de no conformidad",
        icon: ReportProblem,
        route: "/dashboard/catalogos/tipos-no-conformidad",
      },
      {
        id: "tipos-auditoria",
        title: "6. Tipos de auditoría",
        icon: FactCheck,
        route: "/dashboard/catalogos/tipos-auditoria",
      },
      {
        id: "acciones",
        title: "7. Acciones",
        icon: PlaylistAddCheck,
        route: "/dashboard/catalogos/acciones",
      },
      {
        id: "preguntas",
        title: "8. Preguntas",
        icon: Quiz,
        route: "/dashboard/catalogos/preguntas",
      },
    ],
  };

  const items = [
    ...(isAdmin
      ? [
          {
            id: "inicio",
            title: "Inicio",
            icon: Home,
            description: "Panel principal",
            route: "/dashboard",
          },
        ]
      : []),
    {
      id: "auditorias",
      title: "Auditorías",
      icon: Assignment,
      description: isAdmin ? "Asignaciones LPA" : "Mis auditorías y equipo",
      hasSubmenu: true,
      submenu: [
        {
          id: "mis-auditorias",
          title: "Mis auditorías",
          icon: Assignment,
          route: "/dashboard/auditorias",
        },
        {
          id: "mi-equipo",
          title: "Mi equipo",
          icon: Groups,
          route: "/dashboard/auditorias/equipo",
        },
        ...(isAdmin
          ? [
              {
                id: "seguimiento-auditorias",
                title: "Seguimiento del mes",
                icon: FactCheck,
                route: "/dashboard/auditorias/seguimiento",
              },
              {
                id: "generar-auditorias",
                title: "Generar del mes",
                icon: AutoMode,
                route: "/dashboard/auditorias/generar",
              },
            ]
          : []),
      ],
    },
    ...(isAdmin ? [configuracion] : []),
  ];

  return items;
}

function resolveWindowTitle(selectedItemId, menuItems) {
  for (const item of menuItems) {
    if (item.id === selectedItemId) return item.title;
    if (item.submenu) {
      const sub = item.submenu.find((s) => s.id === selectedItemId);
      if (sub) return sub.title;
    }
  }
  if (selectedItemId === "inicio") return "Inicio";
  return "Panel";
}

function DashboardShell({ selectedItemId, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authorized, setAuthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usuarioOk, setUsuarioOk] = useState(null);
  const [empIdSesion, setEmpIdSesion] = useState("");
  const [expandedItems, setExpandedItems] = useState({
    auditorias: false,
    configuracion: false,
  });

  const menuItems = useMemo(() => buildMenuItems(isAdmin), [isAdmin]);
  const windowTitle = useMemo(
    () => resolveWindowTitle(selectedItemId, menuItems),
    [selectedItemId, menuItems],
  );

  useEffect(() => {
    syncSessionCookieFromStorage();

    if (!isAuthenticatedClient()) {
      const path =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "";
      router.replace(
        path.startsWith("/dashboard") && !path.startsWith("//")
          ? `/?redirect=${encodeURIComponent(path)}`
          : "/",
      );
      return;
    }

    setAuthorized(true);
    const admin = localStorage.getItem("isAdmin") === "true";
    setIsAdmin(admin);

    const empId = getMiEmpId();
    setEmpIdSesion(empId);

    if (!empId) {
      setUsuarioOk(false);
      return;
    }

    fetch(`/api/usuarios/verificar/${encodeURIComponent(empId)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          localStorage.setItem("capUser", JSON.stringify(data.data));
          setUsuarioOk(true);
        } else {
          localStorage.removeItem("capUser");
          setUsuarioOk(false);
        }
      })
      .catch(() => {
        localStorage.removeItem("capUser");
        setUsuarioOk(false);
      });

    if (
      selectedItemId === "mis-auditorias" ||
      selectedItemId === "mi-equipo" ||
      selectedItemId === "generar-auditorias" ||
      selectedItemId === "seguimiento-auditorias"
    ) {
      setExpandedItems((p) => ({ ...p, auditorias: true }));
    }
    if (
      [
        "niveles",
        "usuarios",
        "areas",
        "sub-areas",
        "tipos-nc",
        "tipos-auditoria",
        "acciones",
        "preguntas",
      ].includes(selectedItemId)
    ) {
      setExpandedItems((p) => ({ ...p, configuracion: true }));
    }
  }, [selectedItemId, router]);

  useEffect(() => {
    if (!authorized || usuarioOk !== true) return;
    if (isAdmin) return;
    if (isAdminOnlyDashboardPath(pathname)) {
      router.replace(NON_ADMIN_HOME);
    }
  }, [authorized, usuarioOk, isAdmin, pathname, router]);

  const handleItemClick = (item) => {
    if (item.hasSubmenu) {
      setExpandedItems((p) => ({ ...p, [item.id]: !p[item.id] }));
    } else if (item.route && item.id !== selectedItemId) {
      router.push(item.route);
    }
  };

  const handleSubmenuClick = (sub) => {
    if (sub.id !== selectedItemId) router.push(sub.route);
  };

  const handleLogout = () => {
    clearAuthStorageClient();
    router.push("/");
  };

  if (!authorized || usuarioOk === null) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          bgcolor: BRAND.bg,
        }}
      >
        <CircularProgress sx={{ color: BRAND.primary }} />
      </Box>
    );
  }

  if (!usuarioOk && !isAdmin) {
    return (
      <Box sx={{ minHeight: "100vh", bgcolor: BRAND.bg }}>
        <UsuarioBloqueadoModal open empId={empIdSesion} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        sx={{
          width: `calc(100% - ${drawerWidth}px)`,
          ml: `${drawerWidth}px`,
          background: `linear-gradient(90deg, ${BRAND.primaryDark}, ${BRAND.primary})`,
          boxShadow: `0 2px 12px ${BRAND.glow}`,
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 48, sm: 56 } }}>
          <Typography
            sx={{
              flexGrow: 1,
              fontWeight: 800,
              color: "#fff",
              textShadow: "0 1px 3px rgba(0,0,0,0.35), 0 0 8px rgba(0,0,0,0.2)",
            }}
          >
            CAP - {windowTitle}
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            bgcolor: BRAND.navy,
            color: BRAND.paper,
            borderRight: `1px solid ${BRAND.border}`,
          },
        }}
      >
        <Toolbar
          onClick={() => router.push(isAdmin ? "/dashboard" : NON_ADMIN_HOME)}
          sx={{
            justifyContent: "center",
            cursor: "pointer",
            minHeight: 72,
            py: 1,
            borderBottom: `1px solid ${BRAND.border}`,
            "&:hover": { bgcolor: BRAND.hover },
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: 180,
              height: 52,
              position: "relative",
            }}
          >
            <Image
              src="/tristone_logo_head.png"
              alt="Tristone"
              fill
              sizes="180px"
              style={{
                objectFit: "contain",
                objectPosition: "center",
                mixBlendMode: "screen",
              }}
              priority
            />
          </Box>
        </Toolbar>

        <List sx={{ flex: 1, pt: 2, px: 1 }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isExpanded = expandedItems[item.id];
            const isSelected = item.hasSubmenu
              ? item.submenu.some((s) => s.id === selectedItemId)
              : selectedItemId === item.id ||
                (item.id === "auditorias" &&
                  selectedItemId === "mis-auditorias");

            return (
              <Box key={item.id}>
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => handleItemClick(item)}
                    sx={{
                      borderRadius: 1,
                      bgcolor: isSelected ? BRAND.primary : "transparent",
                      "&:hover": {
                        bgcolor: isSelected ? BRAND.primaryDark : BRAND.hover,
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 40,
                        color: isSelected ? "#fff" : BRAND.primaryLight,
                      }}
                    >
                      <Icon />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.title}
                      secondary={item.description}
                      slotProps={{
                        primary: {
                          sx: {
                            fontWeight: 600,
                            color: isSelected ? "#fff" : BRAND.paper,
                          },
                        },
                        secondary: {
                          sx: {
                            fontSize: "0.72rem",
                            color: isSelected
                              ? "rgba(255,255,255,0.85)"
                              : BRAND.muted,
                          },
                        },
                      }}
                    />
                    {item.hasSubmenu &&
                      (isExpanded ? (
                        <ExpandLess
                          sx={{
                            color: isSelected ? "#fff" : BRAND.primaryLight,
                          }}
                        />
                      ) : (
                        <ExpandMore
                          sx={{
                            color: isSelected ? "#fff" : BRAND.primaryLight,
                          }}
                        />
                      ))}
                  </ListItemButton>
                </ListItem>

                {item.hasSubmenu && (
                  <Collapse in={isExpanded} unmountOnExit>
                    <List disablePadding>
                      {item.submenu.map((sub) => {
                        const SubIcon = sub.icon;
                        const subSelected = selectedItemId === sub.id;
                        return (
                          <ListItem
                            key={sub.id}
                            disablePadding
                            sx={{ pl: 2, mb: 0.5 }}
                          >
                            <ListItemButton
                              onClick={() => handleSubmenuClick(sub)}
                              sx={{
                                borderRadius: 1,
                                bgcolor: subSelected
                                  ? BRAND.primary
                                  : "transparent",
                                "&:hover": {
                                  bgcolor: subSelected
                                    ? BRAND.primaryDark
                                    : BRAND.hover,
                                },
                              }}
                            >
                              <ListItemIcon
                                sx={{
                                  minWidth: 32,
                                  color: subSelected
                                    ? "#fff"
                                    : BRAND.primaryLight,
                                }}
                              >
                                <SubIcon sx={{ fontSize: 20 }} />
                              </ListItemIcon>
                              <ListItemText
                                primary={sub.title}
                                slotProps={{
                                  primary: {
                                    sx: {
                                      fontSize: "0.88rem",
                                      fontWeight: subSelected ? 700 : 500,
                                      color: subSelected ? "#fff" : BRAND.paper,
                                    },
                                  },
                                }}
                              />
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  </Collapse>
                )}
              </Box>
            );
          })}
        </List>

        <Divider sx={{ borderColor: BRAND.border }} />
        <List sx={{ p: 1.5 }}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 1,
                border: `1px solid ${BRAND.border}`,
                "&:hover": { bgcolor: BRAND.hover },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: BRAND.primaryLight }}>
                <Logout />
              </ListItemIcon>
              <ListItemText
                primary="Cerrar sesión"
                slotProps={{
                  primary: { sx: { fontWeight: 600, color: BRAND.paper } },
                }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2 },
          pt: { xs: 1.5, sm: 2 },
          width: `calc(100% - ${drawerWidth}px)`,
          minHeight: "100vh",
          bgcolor: BRAND.bg,
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 48, sm: 56 } }} />
        {children}
      </Box>
    </Box>
  );
}

export default DashboardShell;
