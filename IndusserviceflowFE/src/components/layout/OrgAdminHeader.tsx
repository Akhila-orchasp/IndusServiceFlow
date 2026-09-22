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
  Chip,
  Button,
  Divider,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  VpnKey as KeyIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  EventNote as AppointmentsIcon,
  Groups as CustomersIcon,
  Badge as EmployeesIcon,
  HourglassTop as QueuesIcon,
  Build as ServicesIcon,
  Layers as ServiceCategoriesIcon,
  AccountTree as SimulationsIcon,
  History as AuditLogsIcon,
  BarChart as ReportsIcon,
  HourglassTop as PendingIcon,
} from "@mui/icons-material";
import NotificationBell from "../notifications/NotificationBell";
import { useSidebar } from "./SidebarContext";
import { brandGradient } from "../../theme/superAdminMuiTheme";
import { getCustomers, type Customer } from "../../services/customerService";
import { getAppointments, type Appointment } from "../../services/appointmentService";
import { getEmployees, type Employee } from "../../services/employeeService";
import { getServices, getServiceTypes, type CatalogService, type ServiceType } from "../../services/catalogService";
import useSubscriptionStatus from "../../hooks/useSubscriptionStatus";
import RenewPlanDialog from "../subscription/RenewPlanDialog";
import { logout as logoutApi, clearAuthStorage } from "../../services/api";

const DRAWER_WIDTH = 260;
const QUICK_PAGES = [
  { label: "Dashboard", path: "/org-admin/dashboard", icon: DashboardIcon, keywords: ["dashboard", "home", "overview"] },
  { label: "Service Categories", path: "/org-admin/service-categories", icon: ServiceCategoriesIcon, keywords: ["service categories", "categories", "service types"] },
  { label: "Services", path: "/org-admin/services", icon: ServicesIcon, keywords: ["services"] },
  { label: "Employees", path: "/org-admin/employees", icon: EmployeesIcon, keywords: ["employees", "staff", "team"] },
  { label: "Customers", path: "/org-admin/customers", icon: CustomersIcon, keywords: ["customers", "clients"] },
  { label: "Queues", path: "/org-admin/queues", icon: QueuesIcon, keywords: ["queue", "queues", "waiting"] },
  { label: "Appointments", path: "/org-admin/appointments", icon: AppointmentsIcon, keywords: ["appointments", "booking", "bookings"] },
  { label: "Simulations", path: "/org-admin/simulations", icon: SimulationsIcon, keywords: ["simulations", "simulate", "forecast"] },
  { label: "Audit Logs", path: "/org-admin/audit-logs", icon: AuditLogsIcon, keywords: ["audit logs", "audit", "logs", "activity"] },
  { label: "Reports", path: "/org-admin/reports", icon: ReportsIcon, keywords: ["reports", "report"] },
] as const;

const OrgAdminHeader = () => {
  const navigate = useNavigate();
  const { toggle } = useSidebar();
  const orgId = localStorage.getItem("org_id") || "";
  const orgName = localStorage.getItem("org_name") || "Organization";
  const userName = localStorage.getItem("user_name") || localStorage.getItem("name") || "Admin";
  const userEmail = localStorage.getItem("email") || "";
  const userInitial = userName.trim().charAt(0).toUpperCase();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [appointmentResults, setAppointmentResults] = useState<Appointment[]>([]);
  const [employeeResults, setEmployeeResults] = useState<Employee[]>([]);
  const [serviceResults, setServiceResults] = useState<CatalogService[]>([]);
  const [serviceTypeResults, setServiceTypeResults] = useState<ServiceType[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

  const term = query.trim().toLowerCase();

  const pageMatches = term
    ? QUICK_PAGES.filter((p) => p.label.toLowerCase().includes(term) || p.keywords.some((k) => k.includes(term)))
    : [];

  useEffect(() => {
    if (term.length < 2) {
      setCustomerResults([]);
      setAppointmentResults([]);
      setEmployeeResults([]);
      setServiceResults([]);
      setServiceTypeResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(() => {
      Promise.all([
        getCustomers(orgId, { search: term }).catch(() => ({ data: { data: [] as Customer[] } } as any)),
        getAppointments(orgId, { search: term, page_size: 5 }).catch(() => ({ data: { data: [] as Appointment[] } } as any)),
        getEmployees(orgId, { search: term }).catch(() => ({ data: { data: [] as Employee[] } } as any)),
        getServices(orgId, { search: term }).catch(() => ({ data: [] as CatalogService[] })),
        getServiceTypes(orgId, { search: term }).catch(() => ({ data: [] as ServiceType[] })),
      ])
        .then(([customersRes, appointmentsRes, employeesRes, servicesRes, serviceTypesRes]) => {
          setCustomerResults((Array.isArray(customersRes.data?.data) ? customersRes.data.data : []).slice(0, 5));
          setAppointmentResults((Array.isArray(appointmentsRes.data?.data) ? appointmentsRes.data.data : []).slice(0, 5));
          setEmployeeResults((Array.isArray(employeesRes.data?.data) ? employeesRes.data.data : []).slice(0, 5));
          setServiceResults((Array.isArray(servicesRes.data) ? servicesRes.data : []).slice(0, 5));
          setServiceTypeResults((Array.isArray(serviceTypesRes.data) ? serviceTypesRes.data : []).slice(0, 5));
        })
        .finally(() => setSearching(false));
    }, 350);

    return () => clearTimeout(timer);
  }, [term, orgId]);

  const hasAnyResults =
    pageMatches.length > 0 ||
    customerResults.length > 0 ||
    appointmentResults.length > 0 ||
    employeeResults.length > 0 ||
    serviceResults.length > 0 ||
    serviceTypeResults.length > 0;

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


  const { status: subStatus, refetch: refetchSubStatus } = useSubscriptionStatus();
  const [planDialogOpen, setPlanDialogOpen] = useState(false);

  const needsPaymentCompletion = subStatus?.subscription_status === "pending_payment";
  const awaitingApproval = subStatus?.subscription_status === "pending_activation";

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
            {orgName.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="subtitle1" noWrap title={orgName} sx={{ display: { xs: "none", sm: "block" }, maxWidth: 220, fontWeight: 700 }}>
            {orgName}
          </Typography>
        </Box>

        <Box ref={boxRef} sx={{ position: "relative", width: { xs: "auto", sm: 360 }, flex: { xs: 1, sm: "initial" }, maxWidth: { xs: 280, sm: "none" } }}>
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
              placeholder="Search pages, customers, appointments, employees..."
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
              <Paper elevation={4} sx={{ mt: 1, borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider", maxHeight: 420, overflowY: "auto" }}>
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
                        <MenuItem key={a.appointment_id} onClick={() => goTo("/org-admin/appointments")}>
                          <ListItemText primary={`${a.customer_name} · #${a.token_number}`} secondary={a.status} />
                        </MenuItem>
                      ))}
                    </>
                  )}

                  {term.length >= 2 && !searching && customerResults.length > 0 && (
                    <>
                      <ListSubheader sx={{ fontSize: 11, letterSpacing: "0.06em", fontWeight: 700 }}>CUSTOMERS</ListSubheader>
                      {customerResults.map((c) => (
                        <MenuItem key={c.CustomerId} onClick={() => goTo("/org-admin/customers")}>
                          <ListItemText primary={c.CustomerName} secondary={c.Mobile} />
                        </MenuItem>
                      ))}
                    </>
                  )}

                  {term.length >= 2 && !searching && employeeResults.length > 0 && (
                    <>
                      <ListSubheader sx={{ fontSize: 11, letterSpacing: "0.06em", fontWeight: 700 }}>EMPLOYEES</ListSubheader>
                      {employeeResults.map((e) => (
                        <MenuItem key={e.employee_id} onClick={() => goTo("/org-admin/employees")}>
                          <ListItemText primary={e.employee_name} secondary={e.designation} />
                        </MenuItem>
                      ))}
                    </>
                  )}

                  {term.length >= 2 && !searching && serviceResults.length > 0 && (
                    <>
                      <ListSubheader sx={{ fontSize: 11, letterSpacing: "0.06em", fontWeight: 700 }}>SERVICES</ListSubheader>
                      {serviceResults.map((s) => (
                        <MenuItem key={s.service_id} onClick={() => goTo("/org-admin/services")}>
                          <ListItemText primary={s.service_name} secondary={s.service_type_name} />
                        </MenuItem>
                      ))}
                    </>
                  )}

                  {term.length >= 2 && !searching && serviceTypeResults.length > 0 && (
                    <>
                      <ListSubheader sx={{ fontSize: 11, letterSpacing: "0.06em", fontWeight: 700 }}>SERVICE CATEGORIES</ListSubheader>
                      {serviceTypeResults.map((st) => (
                        <MenuItem key={st.service_type_id} onClick={() => goTo("/org-admin/service-categories")}>
                          <ListItemText primary={st.service_type_name} />
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

        {(needsPaymentCompletion || awaitingApproval) && (
          <Box sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 1 }}>
            <Chip
              size="small"
              icon={<PendingIcon fontSize="small" />}
              label={needsPaymentCompletion ? "Payment Pending" : "Activating..."}
              color="warning"
              sx={{ fontWeight: 600 }}
            />
            {needsPaymentCompletion && (
              <Button size="small" variant="outlined" color="warning" onClick={() => setPlanDialogOpen(true)}>
                Complete Payment
              </Button>
            )}
          </Box>
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
          <NotificationBell scope={{ level: "org", orgId }} />

          <IconButton size="small" onClick={(e) => setProfileAnchor(e.currentTarget)}>
            <Avatar sx={{ backgroundImage: brandGradient, width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>
              {userInitial}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={profileAnchor}
            open={profileMenuOpen}
            onClose={() => setProfileAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            sx={{ mt: 1 }}
            slotProps={{
              paper: {
                sx: {
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
                {userInitial}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.3 }}>
                  {userName}
                </Typography>
                {userEmail && (
                  <Typography noWrap sx={{ fontSize: 12.5, color: "text.secondary" }}>
                    {userEmail}
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider />

            <MenuItem onClick={() => goToProfileSection("/org-admin/profile")} sx={{ py: 1.25 }}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>My Profile</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => goToProfileSection("/org-admin/change-password")} sx={{ py: 1.25 }}>
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

      {needsPaymentCompletion && (
        <RenewPlanDialog
          open={planDialogOpen}
          onClose={() => setPlanDialogOpen(false)}
          organizationName={orgName}
          onRenewed={() => {
            refetchSubStatus();
          }}
          title="Complete your payment"
          subtitle="Finish setting up your plan to unlock full access."
          confirmLabel="Continue to Payment"
        />
      )}
    </AppBar>
  );
};

export default OrgAdminHeader;