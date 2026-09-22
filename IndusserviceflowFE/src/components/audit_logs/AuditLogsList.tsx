import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  Typography,
  TextField,
  InputAdornment,
  MenuItem,
  Button,
  Menu,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Chip,
  Avatar,
  Select,
  Stack,
  ThemeProvider,
  CssBaseline,
  alpha,
  Dialog,
  DialogContent,
  Divider,
  Alert,
  Tooltip,
  IconButton,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Restore as RestoreIcon,
  Assignment as ClipboardIcon,
  Download as DownloadIcon,
  History as HistoryIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Sync as SyncIcon,
  PersonAdd as PersonAddIcon,
  AddCircle as AddCircleIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Close as CloseIcon,
} from "@mui/icons-material";

import {
  getAuditLogs,
  exportAuditLogs,
  getOrgAuditLogs,
  exportOrgAuditLogs,
  getUserAuditHistory,
  exportUserAuditHistory,
  getOrgUserAuditHistory,
  exportOrgUserAuditHistory,
} from "../../services/api";
import Toast from "../common/Toast";
import type { ToastType } from "../common/Toast";
import ExportMenu from "../common/ExportMenu";
import superAdminMuiTheme from "../../theme/superAdminMuiTheme";

interface AuditLog {
  audit_id: number;
  audit_date: string;
  username: string;
  role: string;
  organization: string | null;
  action_name: string;
  action_screen: string;
}

interface UserAuditHistoryStats {
  total_actions: number;
  creates: number;
  updates: number;
  deletes: number;
  logins: number;
  first_activity: string | null;
  last_activity: string | null;
}

interface UserAuditHistory {
  username: string;
  stats: UserAuditHistoryStats;
  data: AuditLog[];
}

// Super Admin's audit view excludes Customer/Employee/Service/Queue/
// Feedback/Appointment — those are org-level modules org admins already
// cover on their own scoped view. Super Admin keeps the cross-org and
// platform-level modules: Session, Organizations, Users, Plans, Subscriptions.
//
// "Organizations" (plural) here matches the action_screen string the
// backend now writes consistently for approve/reject/delete/export
// (organizations/views.py) — it used to log those first three as singular
// "Organization" while export used "Organizations", so this filter always
// missed the approve/reject/delete rows.
const SUPER_ADMIN_MODULES = [
  "All modules",
  "Session",
  "Organizations",
  "Users",
  "Plans",
  "Subscriptions",
];

const ORG_ADMIN_MODULES = [
  "All modules",
  "Session",
  "Customers",
  "Employees",
  "Services",
  "Queue",
  "Appointments",
];

const SUPER_ADMIN_ACTIONS = ["All actions", "Login", "Update", "Delete", "Export", "Logout", "Approve", "Reject"];

const ORG_ADMIN_ACTIONS = [
  "All actions",
  "Login",
  "Update",
  "Delete",
  "Export",
  "Logout",
];

const ACTION_META: Record<string, { icon: React.ReactNode; color: "default" | "success" | "info" | "error" | "warning" | "secondary" }> = {
  login: { icon: <LoginIcon sx={{ fontSize: 14 }} />, color: "info" },
  logout: { icon: <LogoutIcon sx={{ fontSize: 14 }} />, color: "default" },
  update: { icon: <EditIcon sx={{ fontSize: 14 }} />, color: "secondary" },
  delete: { icon: <DeleteIcon sx={{ fontSize: 14 }} />, color: "error" },
  export: { icon: <DownloadIcon sx={{ fontSize: 14 }} />, color: "info" },
  "status change": { icon: <SyncIcon sx={{ fontSize: 14 }} />, color: "warning" },
  approve: { icon: <CheckCircleIcon sx={{ fontSize: 14 }} />, color: "success" },
  reject: { icon: <CancelIcon sx={{ fontSize: 14 }} />, color: "error" },
  create: { icon: <AddCircleIcon sx={{ fontSize: 14 }} />, color: "success" },
  assign: { icon: <PersonAddIcon sx={{ fontSize: 14 }} />, color: "secondary" },
};

const initials = (name: string) => {
  if (!name) return "?";
  return name
    .split(/[\s._-]+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

const buildDescription = (log: AuditLog) => {
  const action = (log.action_name || "").toLowerCase();
  if (action === "login") return `${log.username} logged into the system`;
  if (action === "logout") return `${log.username} logged out of the system`;
  return `${log.username} performed ${(log.action_name || "").toUpperCase()} on ${log.action_screen}`;
};

const SummaryCard = ({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) => (
  <Card
    elevation={0}
    sx={{
      p: 2.25,
      display: "flex",
      alignItems: "center",
      gap: 2,
      borderRadius: 3,
      bgcolor: "background.paper",
      boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
    }}
  >
    <Box
      sx={{
        width: 44,
        height: 44,
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: alpha(color, 0.12),
        color,
        flexShrink: 0,
      }}
    >
      {icon}
    </Box>
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  </Card>
);

const AuditLogsList: React.FC = () => {
  const role = localStorage.getItem("role");
  const isSuperAdmin = role === "super_admin";
  const fetchAuditLogs = isSuperAdmin ? getAuditLogs : getOrgAuditLogs;
  const exportAuditLogsFn = isSuperAdmin ? exportAuditLogs : exportOrgAuditLogs;
  const fetchUserHistory = isSuperAdmin ? getUserAuditHistory : getOrgUserAuditHistory;
  const exportUserHistoryFn = isSuperAdmin ? exportUserAuditHistory : exportOrgUserAuditHistory;

  const MODULES = isSuperAdmin ? SUPER_ADMIN_MODULES : ORG_ADMIN_MODULES;
  const ACTION_OPTIONS = isSuperAdmin ? SUPER_ADMIN_ACTIONS : ORG_ADMIN_ACTIONS;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All modules");
  const [actionFilter, setActionFilter] = useState("All actions");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [summary, setSummary] = useState({
    total_logs: 0,
    approves: 0,
    updates: 0,
    deletes: 0,
  });

  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [moduleAnchor, setModuleAnchor] = useState<null | HTMLElement>(null);
  const [actionAnchor, setActionAnchor] = useState<null | HTMLElement>(null);

  const [historyUser, setHistoryUser] = useState<AuditLog | null>(null);
  const [historyData, setHistoryData] = useState<UserAuditHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyExportAnchor, setHistoryExportAnchor] = useState<null | HTMLElement>(null);
  const [historyExporting, setHistoryExporting] = useState(false);


  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 350);
    return () => clearTimeout(timer);
  }, [search, moduleFilter, actionFilter, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, moduleFilter, actionFilter, pageSize]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, any> = { page, page_size: pageSize };
      if (search.trim()) params.search = search.trim();
      if (moduleFilter !== "All modules") params.action_screen = moduleFilter;
      if (actionFilter !== "All actions") params.action_name = actionFilter.toLowerCase();

      const response = await fetchAuditLogs(params);

      setLogs(response?.data ?? []);
      setTotalRecords(response?.pagination?.total_records ?? 0);
      setTotalPages(response?.pagination?.total_pages ?? 1);

      setSummary({
        total_logs: response?.summary?.total_logs ?? 0,
        approves: response?.summary?.approves ?? 0,
        updates: response?.summary?.updates ?? 0,
        deletes: response?.summary?.deletes ?? 0,
      });
    } catch (err) {
      console.error(err);
      setError("Failed to load audit logs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setModuleFilter("All modules");
    setActionFilter("All actions");
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      setExportAnchor(null);

      const params: Record<string, any> = {};
      if (search.trim()) params.search = search.trim();
      if (moduleFilter !== "All modules") params.action_screen = moduleFilter;
      if (actionFilter !== "All actions") params.action_name = actionFilter.toLowerCase();

      const blobData = await exportAuditLogsFn(format, params);
      if (blobData instanceof Blob && blobData.type.includes("json")) {
        const text = await blobData.text();
        let message = "Unable to export audit logs for the selected filters.";
        try {
          const parsed = JSON.parse(text);
          message = parsed?.message || parsed?.error || parsed?.detail || message;
        } catch {
        }
        throw new Error(message);
      }

      const mimeType =
        format === "pdf"
          ? "application/pdf"
          : format === "excel"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv";

      const blob = new Blob([blobData], { type: mimeType });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-logs.${format === "excel" ? "xlsx" : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Export failed:", err);
      setToast({
        type: "error",
        message: err?.message || "Unable to export audit logs. Check the console for details.",
      });
    }
  };

  const openHistory = (log: AuditLog) => setHistoryUser(log);

  const closeHistory = () => {
    setHistoryUser(null);
    setHistoryData(null);
    setHistoryError(null);
    setHistoryExportAnchor(null);
  };

  useEffect(() => {
    if (!historyUser) return;

    setHistoryLoading(true);
    setHistoryError(null);
    setHistoryData(null);

    fetchUserHistory(historyUser.username)
      .then((res: any) => setHistoryData(res))
      .catch(() => setHistoryError("Couldn't load this user's audit history. Please try again."))
      .finally(() => setHistoryLoading(false));
  }, [historyUser]);

  const handleHistoryExport = async (format: "csv" | "excel" | "pdf") => {
    if (!historyUser) return;

    setHistoryExporting(true);
    setHistoryExportAnchor(null);

    try {
      const blobData = await exportUserHistoryFn(historyUser.username, format);

      if (blobData instanceof Blob && blobData.type.includes("json")) {
        const text = await blobData.text();
        let message = "Unable to export this user's audit history.";
        try {
          const parsed = JSON.parse(text);
          message = parsed?.message || parsed?.error || parsed?.detail || message;
        } catch {
        }
        throw new Error(message);
      }

      const mimeType =
        format === "pdf"
          ? "application/pdf"
          : format === "excel"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv";

      const blob = new Blob([blobData], { type: mimeType });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${historyUser.username}_audit_history.${format === "excel" ? "xlsx" : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("History export failed:", err);
      setHistoryError(err?.message || "Export failed. Please try again.");
    } finally {
      setHistoryExporting(false);
    }
  };

  const historyStatTiles = historyData
    ? [
        { label: "Total actions", value: historyData.stats.total_actions, color: "#0F766E", icon: <HistoryIcon fontSize="small" /> },
        { label: "Creates", value: historyData.stats.creates, color: "#16A34A", icon: <AddCircleIcon fontSize="small" /> },
        { label: "Updates", value: historyData.stats.updates, color: "#D97706", icon: <EditIcon fontSize="small" /> },
        { label: "Deletes", value: historyData.stats.deletes, color: "#DC2626", icon: <DeleteIcon fontSize="small" /> },
        { label: "Logins", value: historyData.stats.logins, color: "#0284C7", icon: <LoginIcon fontSize="small" /> },
      ]
    : [];

  const formatWhen = (iso: string) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  return (
    <ThemeProvider theme={superAdminMuiTheme}>
      <CssBaseline />
      <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5 }}>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
          Audit logs
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {isSuperAdmin
            ? "Track actions performed by admins and employees across all organizations."
            : "Track actions performed by your organization's admins and employees."}
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}>
          <SummaryCard icon={<HistoryIcon fontSize="small" />} value={summary.total_logs} label="Total logs" color="#0F766E" />
          <SummaryCard icon={<CheckCircleIcon fontSize="small" />} value={summary.approves} label="Approve" color="#16A34A" />
          <SummaryCard icon={<EditIcon fontSize="small" />} value={summary.updates} label="Updates" color="#D97706" />
          <SummaryCard icon={<DeleteIcon fontSize="small" />} value={summary.deletes} label="Deletes" color="#DC2626" />
        </Box>

        <Card
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            bgcolor: "background.paper",
            boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ mb: 2.5, alignItems: { md: "center" }, justifyContent: "space-between" }}>
            <TextField
              size="small"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: { xs: "100%", md: 320 } }}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }}
            />

            <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<FilterIcon fontSize="small" />}
                onClick={(e) => setModuleAnchor(e.currentTarget)}
              >
                {moduleFilter}
              </Button>
              <Menu
                anchorEl={moduleAnchor}
                open={Boolean(moduleAnchor)}
                onClose={() => setModuleAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 170, mt: 0.5 } } }}
              >
                {MODULES.map((m) => (
                  <MenuItem key={m} onClick={() => { setModuleFilter(m); setModuleAnchor(null); }}>
                    {m}
                  </MenuItem>
                ))}
              </Menu>

              <Button
                variant="outlined"
                color="inherit"
                startIcon={<FilterIcon fontSize="small" />}
                onClick={(e) => setActionAnchor(e.currentTarget)}
              >
                {actionFilter}
              </Button>
              <Menu
                anchorEl={actionAnchor}
                open={Boolean(actionAnchor)}
                onClose={() => setActionAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 160, mt: 0.5 } } }}
              >
                {ACTION_OPTIONS.map((a) => (
                  <MenuItem key={a} onClick={() => { setActionFilter(a); setActionAnchor(null); }}>
                    {a}
                  </MenuItem>
                ))}
              </Menu>

              <Button variant="outlined" color="inherit" startIcon={<DownloadIcon fontSize="small" />} onClick={(e) => setExportAnchor(e.currentTarget)}>
                Export
              </Button>
              <ExportMenu
                anchorEl={exportAnchor}
                onClose={() => setExportAnchor(null)}
                onExport={handleExport}
              />

              <Button color="inherit" startIcon={<RestoreIcon fontSize="small" />} onClick={clearFilters}>
                Clear filters
              </Button>
            </Stack>
          </Stack>

          {loading ? (
            <Box sx={{ p: 5, textAlign: "center", color: "text.secondary" }}>Loading audit logs...</Box>
          ) : error ? (
            <Box sx={{ p: 5, textAlign: "center", color: "error.main" }}>{error}</Box>
          ) : logs.length === 0 ? (
            <Box sx={{ p: 6, textAlign: "center" }}>
              <ClipboardIcon sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                No logs found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search or filters.
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ borderRadius: 3, overflowX: "auto", overflowY: "hidden" }}
              >
                <Table
                  size="small"
                  style={{ width: "fit-content", maxWidth: "100%", tableLayout: "auto" }}
                >
                  <TableHead>
                    <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", bgcolor: "background.default", whiteSpace: "nowrap", py: 2 } }}>
                      <TableCell>When</TableCell>
                      <TableCell>User</TableCell>
                      <TableCell>Module</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right" sx={{ width: "1%", whiteSpace: "nowrap" }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {logs.map((log) => {
                      const key = (log.action_name || "").toLowerCase();
                      const meta = ACTION_META[key] ?? { icon: <HistoryIcon sx={{ fontSize: 14 }} />, color: "default" as const };
                      return (
                        <TableRow key={log.audit_id} hover>
                          <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>{formatWhen(log.audit_date)}</TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                              <Avatar sx={{ width: 30, height: 30, fontSize: 12, bgcolor: "primary.dark" }}>{initials(log.username)}</Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {log.username}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {log.organization || log.role}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>{log.action_screen}</TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            <Chip size="small" icon={meta.icon as any} label={log.action_name} color={meta.color} variant="outlined" />
                          </TableCell>
                          <TableCell sx={{ color: "text.secondary" }}>{buildDescription(log)}</TableCell>
                          <TableCell align="right" sx={{ width: "1%", whiteSpace: "nowrap" }}>
                            <Tooltip title={`View ${log.username}'s full history`}>
                              <IconButton size="small" color="primary" onClick={() => openHistory(log)}>
                                <HistoryIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: "center", mt: 2.5 }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing {totalRecords === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalRecords)} of {totalRecords}
                  </Typography>

                  <Select
                    size="small"
                    value={pageSize}
                    onChange={(e: SelectChangeEvent<number>) => setPageSize(Number(e.target.value))}
                    sx={{ minWidth: 100 }}
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <MenuItem key={size} value={size}>
                        {size} / page
                      </MenuItem>
                    ))}
                  </Select>
                </Stack>

                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  <Button size="small" disabled={page === 1} onClick={() => setPage(1)} sx={{ minWidth: 36, px: 1 }}>
                    <FirstPageIcon fontSize="small" />
                  </Button>
                  <Button size="small" disabled={page === 1} onClick={() => setPage((p) => p - 1)} sx={{ minWidth: 36, px: 1 }}>
                    <ChevronLeftIcon fontSize="small" />
                  </Button>
                  <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                    Page {page} of {totalPages}
                  </Typography>
                  <Button size="small" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} sx={{ minWidth: 36, px: 1 }}>
                    <ChevronRightIcon fontSize="small" />
                  </Button>
                  <Button size="small" disabled={page === totalPages} onClick={() => setPage(totalPages)} sx={{ minWidth: 36, px: 1 }}>
                    <LastPageIcon fontSize="small" />
                  </Button>
                </Stack>
              </Stack>
            </>
          )}
        </Card>
        <Dialog
          open={Boolean(historyUser)}
          onClose={closeHistory}
          maxWidth="sm"
          fullWidth
          scroll="paper"
          slotProps={{ paper: { sx: { borderRadius: 3 } } }}
        >
          {historyUser && (
            <DialogContent dividers sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar sx={{ width: 44, height: 44, bgcolor: "primary.light", color: "primary.dark", fontWeight: 700 }}>
                    {initials(historyUser.username)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {historyUser.username}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {historyUser.organization || historyUser.role}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Tooltip title="Export this user's history">
                    <span>
                      <IconButton
                        size="small"
                        disabled={historyExporting || !historyData || historyData.data.length === 0}
                        onClick={(e) => setHistoryExportAnchor(e.currentTarget)}
                        aria-label="Export history"
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <ExportMenu
                    anchorEl={historyExportAnchor}
                    onClose={() => setHistoryExportAnchor(null)}
                    onExport={handleHistoryExport}
                  />
                  <IconButton size="small" onClick={closeHistory} aria-label="Close">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>

              {historyLoading && (
                <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
                  Loading history...
                </Typography>
              )}

              {!historyLoading && historyError && <Alert severity="error">{historyError}</Alert>}

              {!historyLoading && !historyError && historyData && (
                <>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(5, 1fr)" }, gap: 1.5, mb: 2 }}>
                    {historyStatTiles.map((tile) => (
                      <Card
                        key={tile.label}
                        elevation={0}
                        variant="outlined"
                        sx={{ p: 1.5, borderRadius: 2, textAlign: "center" }}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 1.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: alpha(tile.color, 0.12),
                            color: tile.color,
                            mx: "auto",
                            mb: 0.75,
                          }}
                        >
                          {tile.icon}
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                          {tile.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tile.label}
                        </Typography>
                      </Card>
                    ))}
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    First activity {formatWhen(historyData.stats.first_activity || "")} · Last activity{" "}
                    {formatWhen(historyData.stats.last_activity || "")}
                  </Typography>

                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={1.5}>
                    {historyData.data.length === 0 && (
                      <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                        No recorded activity yet.
                      </Typography>
                    )}

                    {historyData.data.map((log) => {
                      const key = (log.action_name || "").toLowerCase();
                      const meta = ACTION_META[key] ?? { icon: <HistoryIcon sx={{ fontSize: 14 }} />, color: "default" as const };
                      return (
                        <Card key={log.audit_id} elevation={0} variant="outlined" sx={{ p: 1.75, borderRadius: 2 }}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatWhen(log.audit_date)}
                            </Typography>
                            <Chip size="small" icon={meta.icon as any} label={log.action_name} color={meta.color} variant="outlined" />
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {buildDescription(log)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {log.action_screen}
                          </Typography>
                        </Card>
                      );
                    })}
                  </Stack>
                </>
              )}
            </DialogContent>
          )}
        </Dialog>
      </Box>
    </ThemeProvider>

  );
};

export default AuditLogsList;