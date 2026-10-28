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
  Schedule,
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
  VerifiedUser,
  Build,
  PrecisionManufacturing,
  ConfirmationNumber,
  BarChart,
  UploadFile,
} from "@mui/icons-material";
import { useRouter, usePathname } from "next/navigation";
import {
  clearAuthStorageClient,
  isAuthenticatedClient,
  syncSessionCookieFromStorage,
} from "@/libs/auth_session";
import {
  canAccessDashboardPath,
  getCapAccessClient,
  resolveDeniedRedirect,
  NON_ADMIN_HOME,
} from "@/libs/dashboard_access";
import { isAuditorLpaSinRolesCap } from "@/libs/cap_roles";
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

function buildMenuGroups(access) {
  const isAdmin = access.canCalidadAdmin;
  const configuracion = {
    id: "configuracion",
    title: "Configuración",
    icon: Settings,
    description: "Catálogos LPA · siga el orden",
    hasSubmenu: true,
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
        id: "turnos",
        title: "4. Turnos",
        icon: Schedule,
        route: "/dashboard/catalogos/turnos",
      },
      {
        id: "sub-areas",
        title: "5. Sub áreas",
        icon: AccountTree,
        route: "/dashboard/catalogos/sub-areas",
      },
      {
        id: "tipos-nc",
        title: "6. Tipos de no conformidad",
        icon: ReportProblem,
        route: "/dashboard/catalogos/tipos-no-conformidad",
      },
      {
        id: "tipos-auditoria",
        title: "7. Tipos de auditoría",
        icon: FactCheck,
        route: "/dashboard/catalogos/tipos-auditoria",
      },
      {
        id: "acciones",
        title: "8. Acciones",
        icon: PlaylistAddCheck,
        route: "/dashboard/catalogos/acciones",
      },
      {
        id: "preguntas",
        title: "9. Preguntas",
        icon: Quiz,
        route: "/dashboard/catalogos/preguntas",
      },
    ],
  };

  const auditorias = {
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
  };

  const soloCapArea =
    (access.isCapMantenimiento || access.isCapProcesos) && !access.isCapAdmin;

  const auditorSinRolesCap = isAuditorLpaSinRolesCap(access);

  const misAuditoriasNav = {
    id: "mis-auditorias",
    title: "Mis auditorías",
    icon: Assignment,
    description: "Auditorías LPA asignadas",
    route: "/dashboard/auditorias",
  };

  const miEquipoNav = {
    id: "mi-equipo",
    title: "Mi equipo",
    icon: Groups,
    description: "Pendientes de subordinados",
    route: "/dashboard/auditorias/equipo",
  };

  const lpaAuditoriasMenu = {
    id: "auditorias",
    title: "Auditorías",
    icon: Assignment,
    description: "Mis auditorías y equipo",
    hasSubmenu: true,
    submenu: [misAuditoriasNav, miEquipoNav],
  };

  const calidadItemsAuditorSolo = [lpaAuditoriasMenu];

  const calidadItems = auditorSinRolesCap
    ? calidadItemsAuditorSolo
    : [
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
        auditorias,
        ...(isAdmin ? [configuracion] : []),
      ];

  const groups = [];
  if (!soloCapArea) {
    groups.push({
      id: "calidad",
      label: auditorSinRolesCap ? "" : "Calidad",
      items: calidadItems,
    });
  } else {
    groups.push({
      id: "lpa",
      label: "",
      items: [lpaAuditoriasMenu],
    });
  }

  if (access.canMantenimiento) {
    groups.push({
      id: "mantenimiento",
      label: "Mantenimiento",
      items: [
        {
          id: "mantenimiento",
          title: "Mantenimiento",
          icon: Build,
          description: "Tickets por hallazgos Poka Yoke",
          hasSubmenu: true,
          submenu: [
            {
              id: "tickets-mantenimiento",
              title: "Tickets",
              icon: ConfirmationNumber,
              route: "/dashboard/mantenimiento/tickets",
            },
          ],
        },
      ],
    });
  }

  if (access.canProcesos) {
    groups.push({
      id: "procesos",
      label: "Procesos",
      items: [
        {
          id: "procesos",
          title: "Procesos",
          icon: PrecisionManufacturing,
          description: "Checklist y catálogos de proceso",
          hasSubmenu: true,
          submenu: [
            {
              id: "tickets-procesos",
              title: "Cierre de tickets",
              icon: ConfirmationNumber,
              route: "/dashboard/procesos/tickets",
            },
            {
              id: "graficas-poka-yoke",
              title: "Gráficas Poka Yoke",
              icon: BarChart,
              route: "/dashboard/procesos/graficas-poka-yoke",
            },
            {
              id: "preguntas-poka-yoke",
              title: "Preguntas Poka Yoke",
              icon: VerifiedUser,
              route: "/dashboard/catalogos/preguntas-poka-yoke",
            },
            {
              id: "procesos-clientes",
              title: "Clientes",
              icon: Business,
              route: "/dashboard/procesos/clientes",
            },
            {
              id: "adjuntar-listado-poka-yoke",
              title: "Adjuntar listado Poka Yoke",
              icon: UploadFile,
              route: "/dashboard/procesos/adjuntar-listado-poka-yoke",
            },
          ],
        },
      ],
    });
  }

  return groups;
}

function flattenMenuItems(groups) {
  return groups.flatMap((g) => g.items);
}

function resolveWindowTitle(selectedItemId, menuGroups) {
  const menuItems = flattenMenuItems(menuGroups);
  for (const item of menuItems) {
    if (item.id === selectedItemId) return item.title;
    if (item.submenu) {
      const sub = item.submenu.find(
        (s) => s.id === selectedItemId && !s.divider && !s.section,
      );
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
  const [capAccess, setCapAccess] = useState(() => getCapAccessClient());
  const [usuarioOk, setUsuarioOk] = useState(null);
  const [empIdSesion, setEmpIdSesion] = useState("");
  const [expandedItems, setExpandedItems] = useState({
    auditorias: false,
    configuracion: false,
    mantenimiento: false,
    procesos: false,
  });

  const menuGroups = useMemo(() => buildMenuGroups(capAccess), [capAccess]);
  const windowTitle = useMemo(
    () => resolveWindowTitle(selectedItemId, menuGroups),
    [selectedItemId, menuGroups],
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
    const access = getCapAccessClient();
    setCapAccess(access);
    setIsAdmin(access.canCalidadAdmin);

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
        "turnos",
        "sub-areas",
        "tipos-nc",
        "tipos-auditoria",
        "acciones",
        "preguntas",
      ].includes(selectedItemId)
    ) {
      setExpandedItems((p) => ({ ...p, configuracion: true }));
    }
    if (
      selectedItemId === "preguntas-poka-yoke" ||
      selectedItemId === "tickets-procesos" ||
      selectedItemId === "graficas-poka-yoke" ||
      selectedItemId === "adjuntar-listado-poka-yoke" ||
      selectedItemId === "procesos-clientes"
    ) {
      setExpandedItems((p) => ({ ...p, procesos: true }));
    }
    if (selectedItemId === "tickets-mantenimiento") {
      setExpandedItems((p) => ({ ...p, mantenimiento: true }));
    }
  }, [selectedItemId, router]);

  useEffect(() => {
    if (!authorized) return;
    const access = getCapAccessClient();
    if (canAccessDashboardPath(pathname, access)) return;
    const dest = resolveDeniedRedirect(pathname, access);
    if (dest) router.replace(dest);
  }, [authorized, pathname, router]);

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

  if (!usuarioOk && !capAccess.bypassUsuarioCap) {
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
          {menuGroups.map((group) => (
            <Box key={group.id} sx={{ mb: 1 }}>
              {group.label ? (
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    px: 1.5,
                    py: 0.75,
                    color: BRAND.muted,
                    fontWeight: 800,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    fontSize: "0.68rem",
                  }}
                >
                  {group.label}
                </Typography>
              ) : null}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isExpanded = expandedItems[item.id];
                const isSelected = item.hasSubmenu
                  ? item.submenu.some(
                      (s) =>
                        s.id === selectedItemId && !s.divider && !s.section,
                    )
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
                            bgcolor: isSelected
                              ? BRAND.primaryDark
                              : BRAND.hover,
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
                          {item.submenu.length === 0 ? (
                            <Typography
                              variant="caption"
                              sx={{
                                display: "block",
                                pl: 3,
                                pr: 1,
                                py: 1,
                                color: BRAND.muted,
                                fontSize: "0.75rem",
                              }}
                            >
                              Sin catálogos por ahora
                            </Typography>
                          ) : null}
                          {item.submenu.map((sub, subIdx) => {
                            if (sub.section || sub.divider) {
                              const label = sub.section || "—";
                              return (
                                <Box
                                  key={`sub-section-${subIdx}-${label}`}
                                  sx={{ px: 2, py: 0.75 }}
                                >
                                  <Divider
                                    sx={{
                                      borderColor: "rgba(255,255,255,0.12)",
                                    }}
                                  />
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      display: "block",
                                      mt: 0.75,
                                      px: 0.5,
                                      color: BRAND.muted,
                                      fontWeight: 700,
                                      letterSpacing: 0.3,
                                      textTransform: "uppercase",
                                      fontSize: "0.65rem",
                                    }}
                                  >
                                    {label}
                                  </Typography>
                                </Box>
                              );
                            }
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
                                          color: subSelected
                                            ? "#fff"
                                            : BRAND.paper,
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
            </Box>
          ))}
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
