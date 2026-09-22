import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  IconButton,
  InputBase,
  Paper,
  Avatar,
  Box,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Popper,
  ClickAwayListener,
  MenuList,
  ListSubheader,
  CircularProgress,
  Divider,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  VpnKey as KeyIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  HourglassTop as QueueIcon,
  CalendarMonth as ScheduleIcon,
  TrendingUp as PerformanceIcon,
  EventNote as AppointmentIcon,
  PersonOutlined as CustomerIcon,
} from "@mui/icons-material";
import NotificationBell from "../notifications/NotificationBell";
import { useSidebar } from "./SidebarContext";
import { brandGradient } from "../../theme/superAdminMuiTheme";
import {
  searchCustomers,
  searchAppointments,
  getOrganizationById,
} from "../../services/employeeService";
import { logout as logoutApi, clearAuthStorage } from "../../services/api";

const DRAWER_WIDTH = 260;

interface EmployeeHeaderProps {
  orgName?: string;
  employeeName?: string;
  designation?: string;
  employeeId?: string;
  orgId?: string;
}

interface CustomerResult {
  CustomerId: number;
  CustomerName: string;
  Mobile: string;
}

interface AppointmentResult {
  appointment_id: number;
  token_number: string;
  customer_name: string;
  status: string;
}

const QUICK_PAGES = [
  { label: "Dashboard", path: "/employee/dashboard", icon: DashboardIcon, keywords: ["dashboard", "home", "overview"] },
  { label: "My Queue", path: "/employee/my-queue", icon: QueueIcon, keywords: ["queue", "waiting", "customers waiting"] },
  { label: "My Schedule", path: "/employee/my-schedule", icon: ScheduleIcon, keywords: ["schedule", "shift", "appointments", "calendar"] },
  { label: "Performance", path: "/employee/performance", icon: PerformanceIcon, keywords: ["performance", "stats", "handling time", "rating"] },
];

const getInitial = (name?: string) => (name ? name.trim().charAt(0).toUpperCase() : "E");

const EmployeeHeader = ({
  orgName,
  employeeName,
  employeeId,
  orgId,
}: EmployeeHeaderProps) => {
  const navigate = useNavigate();
  const { toggle } = useSidebar();

  const employee = employeeName || localStorage.getItem("name") || "Employee";
  const empId = employeeId || localStorage.getItem("employee_id") || undefined;
  const orgIdValue = orgId || localStorage.getItem("org_id") || undefined;
  const initialOrg = orgName || localStorage.getItem("org_name") || "";
  const [orgDisplay, setOrgDisplay] = useState(initialOrg || "Your Organization");

  useEffect(() => {
    const needsLookup = (!initialOrg || initialOrg === "Your Organization") && orgIdValue;
    if (!needsLookup) return;

    getOrganizationById(orgIdValue as string)
      .then((res) => {
        const name = res.data?.organization_name;
        if (name) {
          setOrgDisplay(name);
          localStorage.setItem("org_name", name);
        }
      })
      .catch(() => { });
  }, [orgIdValue]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [customerResults, setCustomerResults] = useState<CustomerResult[]>([]);
  const [appointmentResults, setAppointmentResults] = useState<AppointmentResult[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  const term = query.trim().toLowerCase();

  const pageMatches = term
    ? QUICK_PAGES.filter((p) => p.label.toLowerCase().includes(term) || p.keywords.some((k) => k.includes(term)))
    : [];

  useEffect(() => {
    if (term.length < 2) {
      setCustomerResults([]);
      setAppointmentResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(() => {
      Promise.all([
        searchCustomers(term, orgIdValue).catch((err) => {
          console.error("Customer search failed:", err);
          return { data: [] };
        }),
        searchAppointments(term, orgIdValue).catch((err) => {
          console.error("Appointment search failed:", err);
          return { data: [] };
        }),
      ])
        .then(([customersRes, appointmentsRes]) => {
          const customers = Array.isArray((customersRes.data as any)?.data)
            ? (customersRes.data as any).data
            : [];
          const appointments = Array.isArray((appointmentsRes.data as any)?.data)
            ? (appointmentsRes.data as any).data
            : [];
          setCustomerResults(customers.slice(0, 5));
          setAppointmentResults(appointments.slice(0, 5));
        })
        .finally(() => setSearching(false));
    }, 350);

    return () => clearTimeout(timer);
  }, [term, orgIdValue]);

  const hasAnyResults = pageMatches.length > 0 || customerResults.length > 0 || appointmentResults.length > 0;

  const goTo = (path: string) => {
    navigate(path);
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && pageMatches.length > 0) {
      goTo(pageMatches[0].path);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // ---------- Profile menu ----------
  const [profileAnchor, setProfileAnchor] = useState<null | HTMLElement>(null);
  const profileMenuOpen = Boolean(profileAnchor);

  const goToProfileSection = (path: string) => {
    setProfileAnchor(null);
    navigate(path);
  };

  const handleLogout = async () => {
    setProfileAnchor(null);
    try {
      await logoutApi();
    } catch (err) {
      console.error("Logout call failed:", err);
    } finally {
      clearAuthStorage();
      sessionStorage.clear();
      navigate("/login");
    }
  };

  return (
    <AppBar
      position="fixed"
      color="inherit"
      sx={{
        width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        ml: { md: `${DRAWER_WIDTH}px` },
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Toolbar sx={{ gap: 2.5, minHeight: "72px !important", px: { xs: 2, md: 4 } }}>
        <IconButton onClick={toggle} sx={{ display: { md: "none" }, bgcolor: "action.hover" }}>
          <MenuIcon fontSize="small" />
        </IconButton>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mr: "auto", minWidth: 0 }}>
          <Avatar variant="rounded" sx={{ backgroundImage: brandGradient, color: "#fff", width: 34, height: 34, fontSize: 14, fontWeight: 700 }}>
            {getInitial(orgDisplay)}
          </Avatar>
          <Typography variant="subtitle1" noWrap title={orgDisplay} sx={{ display: { xs: "none", sm: "block" }, maxWidth: 220, fontWeight: 700 }}>
            {orgDisplay}
          </Typography>
        </Box>

        <Box ref={boxRef} sx={{ position: "relative", width: { xs: "auto", sm: 340 }, flex: { xs: 1, sm: "initial" }, maxWidth: { xs: 280, sm: "none" } }}>
          <Paper
            component="form"
            onSubmit={(e) => e.preventDefault()}
            elevation={0}
            sx={{
              display: "flex",
              alignItems: "center",
              px: 2,
              height: 42,
              borderRadius: 999,
              bgcolor: "background.default",
              border: "1px solid transparent",
              "&:focus-within": { borderColor: "primary.main", bgcolor: "background.paper" },
            }}
          >
            <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
            <InputBase
              placeholder="Search pages, customers, appointments..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(e.target.value.trim().length > 0);
              }}
              onFocus={() => setOpen(query.trim().length > 0)}
              onKeyDown={handleKeyDown}
              sx={{ ml: 1.25, flex: 1, fontSize: 14 }}
            />
          </Paper>

          <Popper open={open && Boolean(term)} anchorEl={boxRef.current} placement="bottom-start" style={{ width: boxRef.current?.offsetWidth, zIndex: 1300 }}>
            <ClickAwayListener onClickAway={() => setOpen(false)}>
              <Paper elevation={4} sx={{ mt: 1, borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider", maxHeight: 360, overflowY: "auto" }}>
                <MenuList dense>
                  {pageMatches.length > 0 && (
                    <ListSubheader sx={{ fontSize: 11, letterSpacing: "0.06em", fontWeight: 700 }}>PAGES</ListSubheader>
                  )}
                  {pageMatches.map((p) => (
                    <MenuItem key={p.path} onClick={() => goTo(p.path)}>
                      <ListItemIcon>
                        <p.icon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>{p.label}</ListItemText>
                    </MenuItem>
                  ))}

                  {term.length >= 2 && searching && (
                    <MenuItem disabled sx={{ justifyContent: "center", gap: 1 }}>
                      <CircularProgress size={14} /> Searching...
                    </MenuItem>
                  )}

                  {term.length >= 2 && !searching && appointmentResults.length > 0 && (
                    <>
                      <ListSubheader sx={{ fontSize: 11, letterSpacing: "0.06em", fontWeight: 700 }}>APPOINTMENTS</ListSubheader>
                      {appointmentResults.map((a) => (
                        <MenuItem key={a.appointment_id} onClick={() => goTo("/employee/my-queue")}>
                          <ListItemIcon>
                            <AppointmentIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={`${a.customer_name} · #${a.token_number}`} secondary={a.status} />
                        </MenuItem>
                      ))}
                    </>
                  )}

                  {term.length >= 2 && !searching && customerResults.length > 0 && (
                    <>
                      <ListSubheader sx={{ fontSize: 11, letterSpacing: "0.06em", fontWeight: 700 }}>CUSTOMERS</ListSubheader>
                      {customerResults.map((c) => (
                        <MenuItem key={c.CustomerId} onClick={() => goTo("/employee/my-queue")}>
                          <ListItemIcon>
                            <CustomerIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={c.CustomerName} secondary={c.Mobile} />
                        </MenuItem>
                      ))}
                    </>
                  )}

                  {!searching && !hasAnyResults && (
                    <MenuItem disabled>
                      <ListItemText>No results for "{query}"</ListItemText>
                    </MenuItem>
                  )}
                </MenuList>
              </Paper>
            </ClickAwayListener>
          </Popper>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
          {empId && <NotificationBell scope={{ level: "employee", employeeId: empId }} />}

          <IconButton size="small" onClick={(e) => setProfileAnchor(e.currentTarget)}>
            <Avatar sx={{ backgroundImage: brandGradient, width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>
              {getInitial(employee)}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={profileAnchor}
            open={profileMenuOpen}
            onClose={() => setProfileAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  minWidth: 260,
                  borderRadius: 3,
                  overflow: "hidden",
                  boxShadow: "0 12px 32px rgba(15,23,42,0.16)",
                },
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.75, bgcolor: "background.default" }}>
              <Avatar sx={{ backgroundImage: brandGradient, width: 44, height: 44, fontSize: 16, fontWeight: 700 }}>
                {getInitial(employee)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.3 }}>
                  {employee}
                </Typography>
                {localStorage.getItem("email") && (
                  <Typography noWrap sx={{ fontSize: 12.5, color: "text.secondary" }}>
                    {localStorage.getItem("email")}
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider />

            <MenuItem onClick={() => goToProfileSection("/employee/profile")} sx={{ py: 1.25 }}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>My Profile</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => goToProfileSection("/employee/change-password")} sx={{ py: 1.25 }}>
              <ListItemIcon>
                <KeyIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Change Password</ListItemText>
            </MenuItem>

            <Divider />

            <MenuItem
              onClick={handleLogout}
              sx={{
                py: 1.25,
                color: "error.main",
                "&:hover": { bgcolor: "error.light" },
              }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" sx={{ color: "error.main" }} />
              </ListItemIcon>
              <ListItemText>Sign Out</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default EmployeeHeader;