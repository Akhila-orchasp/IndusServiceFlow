import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  Drawer,
  Box,
  Toolbar,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  useMediaQuery,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Sell as CategoriesIcon,
  Business as OrganizationsIcon,
  Group as UsersIcon,
  History as AuditLogsIcon,
  BarChart as ReportsIcon,
  CreditCard as SubscriptionsIcon,
  ReceiptLong as PlansIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import { logout as logoutApi, clearAuthStorage } from "../../services/api";
import { useSidebar } from "./SidebarContext";
import superAdminMuiTheme from "../../theme/superAdminMuiTheme";

const DRAWER_WIDTH = 260;

const NAV_ITEMS = [
  { to: "/super-admin/dashboard", label: "Dashboard", icon: <DashboardIcon fontSize="small" /> },
  { to: "/super-admin/categories", label: "Categories", icon: <CategoriesIcon fontSize="small" /> },
  { to: "/super-admin/organizations", label: "Organizations", icon: <OrganizationsIcon fontSize="small" /> },
  { to: "/super-admin/users", label: "Users", icon: <UsersIcon fontSize="small" /> },
  { to: "/super-admin/audit-logs", label: "Audit Logs", icon: <AuditLogsIcon fontSize="small" /> },
  { to: "/super-admin/reports", label: "Reports", icon: <ReportsIcon fontSize="small" /> },
  { to: "/super-admin/subscriptions", label: "Subscriptions", icon: <SubscriptionsIcon fontSize="small" /> },
  { to: "/super-admin/plans", label: "Plans", icon: <PlansIcon fontSize="small" /> },
];

const ISFLogo = () => (
  <img
    src="/indusserviseflow logo.png"
    alt="IndusServiceFlow"
    style={{ width: 38, height: 38, objectFit: "contain" }}
  />
);

const Sidebar = () => {
  const { isOpen, close } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const isDesktop = useMediaQuery(superAdminMuiTheme.breakpoints.up("md"));

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.error("Logout call failed:", err);
    } finally {
      clearAuthStorage();
      sessionStorage.clear();
      close();
      navigate("/login");
    }
  };

  const content = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar sx={{ gap: 1.5, borderBottom: "1px solid", borderColor: "rgba(255,255,255,0.15)", minHeight: "72px !important" }}>
        <ISFLogo />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, color: "#fff" }}>
            IndusServiceFlow
          </Typography>
          <Typography variant="caption" sx={{ letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
            Super Admin
          </Typography>
        </Box>
      </Toolbar>

      <List sx={{ px: 1.5, py: 2, flex: 1, overflowY: "auto" }}>
        {NAV_ITEMS.map((item) => {
          const active = location.pathname.startsWith(item.to);
          return (
            <ListItemButton
              key={item.to}
              component={Link}
              to={item.to}
              onClick={close}
              selected={active}
              sx={{
                borderRadius: "8px",
                mb: "1px",
                py: 1,
                position: "relative",
                color: active ? "#fff" : "rgba(255,255,255,0.75)",
                "&:hover": { backgroundColor: "rgba(255,255,255,0.08)" },
                "&::before": {
                  content: '""',
                  position: "absolute",
                  left: -2,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 3,
                  height: active ? 18 : 0,
                  borderRadius: 999,
                  bgcolor: "#fff",
                  transition: "height .15s",
                },
                "&.Mui-selected": {
                  backgroundColor: "rgba(255,255,255,0.16)",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.20)" },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 34, color: "inherit" }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{ primary: { sx: { fontSize: 13.5, fontWeight: active ? 600 : 500 } } }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ mt: "auto", pt: 2, px: 1.5, pb: 2 }}>
        <Divider sx={{ mb: 1.5, borderColor: "rgba(255,255,255,0.15)" }} />
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: "8px",
            py: 1.25,
            backgroundColor: "#fff",
            color: "#EF4444",
            "& .MuiListItemIcon-root": { color: "#EF4444" },
            "&:hover": {
              backgroundColor: "#F87171",
              color: "#fff",
              "& .MuiListItemIcon-root": { color: "#fff" },
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 34 }}>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Logout" slotProps={{ primary: { sx: { fontWeight: 600, fontSize: 13.5 } } }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isDesktop ? "permanent" : "temporary"}
      open={isDesktop ? true : isOpen}
      onClose={close}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
          bgcolor: "primary.dark",
          borderRight: "none",
        },
      }}
    >
      {content}
    </Drawer>
  );
};

export default Sidebar;