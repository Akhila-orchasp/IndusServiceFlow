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
  Divider,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Waves as BrandIcon,
  Person as PersonIcon,
  VpnKey as KeyIcon,
  Logout as LogoutIcon,
  Dashboard as DashboardIcon,
  Sell as CategoriesIcon,
  Business as OrganizationsIcon,
  Group as UsersIcon,
  History as AuditLogsIcon,
  BarChart as ReportsIcon,
  CreditCard as SubscriptionsIcon,
  ReceiptLong as PlansIcon,
} from "@mui/icons-material";
import { useSidebar } from "./SidebarContext";
import NotificationBell from "../notifications/NotificationBell";
import { brandGradient } from "../../theme/superAdminMuiTheme";
import { logout as logoutApi, clearAuthStorage } from "../../services/api";

const DRAWER_WIDTH = 260;
const getUserName = () => {
  const name = localStorage.getItem("name") || localStorage.getItem("user_name");
  return name && name.trim() ? name.trim() : "Super Admin";
};
const getUserInitial = () => getUserName().charAt(0).toUpperCase();
const getUserEmail = () => localStorage.getItem("email") || "";

const SEARCH_TARGETS = [
  { key: "dashboard", label: "Dashboard", icon: DashboardIcon, path: "/super-admin/dashboard", keywords: ["dashboard", "home", "overview"] },
  { key: "categories", label: "Categories", icon: CategoriesIcon, path: "/super-admin/categories", keywords: ["category", "categories"] },
  { key: "organizations", label: "Organizations", icon: OrganizationsIcon, path: "/super-admin/organizations", keywords: ["organization", "organizations", "organisation", "org"] },
  { key: "users", label: "Users", icon: UsersIcon, path: "/super-admin/users", keywords: ["user", "users", "admin", "admins"] },
  { key: "audit-logs", label: "Audit Logs", icon: AuditLogsIcon, path: "/super-admin/audit-logs", keywords: ["audit logs", "audit", "logs", "activity"] },
  { key: "reports", label: "Reports", icon: ReportsIcon, path: "/super-admin/reports", keywords: ["reports", "report"] },
  { key: "subscriptions", label: "Subscriptions", icon: SubscriptionsIcon, path: "/super-admin/subscriptions", keywords: ["subscriptions", "subscription", "billing"] },
  { key: "plans", label: "Plans", icon: PlansIcon, path: "/super-admin/plans", keywords: ["plans", "plan", "pricing"] },
] as const;

const matchPageTarget = (raw: string) => {
  const term = raw.trim().toLowerCase();
  if (!term) return null;
  return (
    SEARCH_TARGETS.find((target) =>
      target.keywords.some((keyword) => keyword.startsWith(term) || term.startsWith(keyword))
    ) ?? null
  );
};

const Header = () => {
  const navigate = useNavigate();
  const { toggle } = useSidebar();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const pageMatch = matchPageTarget(query);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const openPage = (path: string) => {
    navigate(path);
    setQuery("");
    setOpen(false);
  };

  const goTo = (path: string) => {
    const term = query.trim();
    if (!term) return;
    navigate(`${path}?search=${encodeURIComponent(term)}`);
    setOpen(false);
  };

  const handleSubmit = () => {
    if (pageMatch) {
      openPage(pageMatch.path);
    } else {
      goTo(SEARCH_TARGETS[3].path);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const suggestions = SEARCH_TARGETS.filter((t) => !pageMatch || t.key !== pageMatch.key).filter((t) =>
    t.keywords.some((k) => k.includes(query.trim().toLowerCase()))
  );

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
        <IconButton
          onClick={(e) => {
            e.currentTarget.blur();
            toggle();
          }}
          sx={{ display: { md: "none" }, bgcolor: "action.hover" }}
        >
          <MenuIcon fontSize="small" />
        </IconButton>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mr: "auto", minWidth: 0 }}>
          <Avatar variant="rounded" sx={{ backgroundImage: brandGradient, color: "#fff", width: 34, height: 34 }}>
            <BrandIcon fontSize="small" />
          </Avatar>
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700, display: { xs: "none", sm: "block" } }}>
            Super Admin Portal
          </Typography>
        </Box>

        <Box ref={boxRef} sx={{ position: "relative", width: { xs: "auto", sm: 320 }, flex: { xs: 1, sm: "initial" }, maxWidth: { xs: 280, sm: "none" } }}>
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
            <SearchIcon fontSize="small" sx={{ color: "text.secondary", cursor: "pointer" }} onClick={handleSubmit} />
            <InputBase
              placeholder="Search modules, organizations, users..."
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

          <Popper open={open && Boolean(query.trim())} anchorEl={boxRef.current} placement="bottom-start" style={{ width: boxRef.current?.offsetWidth, zIndex: 1300 }}>
            <ClickAwayListener onClickAway={() => setOpen(false)}>
              <Paper elevation={4} sx={{ mt: 1, borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider" }}>
                <MenuList dense>
                  {pageMatch && (
                    <MenuItem onClick={() => openPage(pageMatch.path)} sx={{ bgcolor: "secondary.light" }}>
                      <ListItemIcon>
                        <pageMatch.icon fontSize="small" sx={{ color: "secondary.dark" }} />
                      </ListItemIcon>
                      <ListItemText>
                        Go to <strong>{pageMatch.label}</strong> page
                      </ListItemText>
                    </MenuItem>
                  )}
                  {suggestions.map(({ key, label, icon: Icon, path }) => (
                    <MenuItem key={key} onClick={() => goTo(path)}>
                      <ListItemIcon>
                        <Icon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>
                        Search "{query.trim()}" in {label}
                      </ListItemText>
                    </MenuItem>
                  ))}
                </MenuList>
              </Paper>
            </ClickAwayListener>
          </Popper>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
          <NotificationBell scope={{ level: "super" }} />

          <IconButton size="small" onClick={(e) => setProfileAnchor(e.currentTarget)}>
            <Avatar sx={{ backgroundImage: brandGradient, width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>
              {getUserInitial()}
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
                {getUserInitial()}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.3 }}>
                  {getUserName()}
                </Typography>
                {getUserEmail() && (
                  <Typography noWrap sx={{ fontSize: 12.5, color: "text.secondary" }}>
                    {getUserEmail()}
                  </Typography>
                )}
              </Box>
            </Box>

            <Divider />

            <MenuItem onClick={() => goToProfileSection("/super-admin/profile")} sx={{ py: 1.25 }}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>My Profile</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => goToProfileSection("/super-admin/change-password")} sx={{ py: 1.25 }}>
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

export default Header;