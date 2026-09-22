import { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Card,
  TextField,
  InputAdornment,
  Button,
  Menu,
  MenuItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  alpha,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Groups as UsersIcon,
  CheckCircle as CheckCircleIcon,
  PauseCircle as PauseCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  WorkspacePremium as UpgradeIcon,
} from "@mui/icons-material";
import {
  getEmployees,
  getEmployeeSummary,
  setEmployeeStatus,
  deleteEmployee,
  exportEmployeesCsv,
  exportEmployeesExcel,
  exportEmployeesPdf,
} from "../../../services/employeeService";
import type { Employee } from "../../../services/employeeService";
import AddEmployee from "./AddEmployee";
import EditEmployee from "./Editemployee";
import { useConfirm } from "../../common/ConfirmDialog";
import ExportMenu from "../../common/ExportMenu";
import type { ExportFormat } from "../../common/ExportMenu";
import Toast from "../../common/Toast";
import type { ToastType } from "../../common/Toast";
import usePlanAccess from "../../../hooks/usePlanAccess";
import RenewPlanDialog from "../../subscription/RenewPlanDialog";

type EmployeeSummary = {
  totalEmployees: number;
  activeEmployees: number;
  onHoldEmployees: number;
  inactiveEmployees: number;
};

type EmployeeStatus = "Active" | "On Hold" | "Inactive";

const PAGE_SIZE = 10;

const STATUS_FILTERS: Array<EmployeeStatus | "All"> = ["All", "Active", "On Hold", "Inactive"];

const statusChipColor = (status: EmployeeStatus): "success" | "warning" | "default" => {
  if (status === "Active") return "success";
  if (status === "On Hold") return "warning";
  return "default";
};

const getInitials = (name: string) =>
  name
    ? name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join("")
    : "?";

const SUMMARY_COLORS = {
  total: "#0F766E",
  active: "#16A34A",
  onHold: "#D97706",
  inactive: "#DC2626",
};

const EmployeesPage = () => {
  const confirm = useConfirm();
  const orgId = localStorage.getItem("org_id") || undefined;
  const orgName = localStorage.getItem("org_name") || "Your organization";
  const { isReadOnly, employeeLimit, canAddEmployee, blockedReason, refetch: refetchPlan } = usePlanAccess();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<EmployeeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "All">("All");
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [busyRow, setBusyRow] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<number | null>(null);

  const loadEmployees = (targetPage = page) => {
    setLoading(true);
    setError(null);
    getEmployees(orgId, {
      search: query.trim() || undefined,
      status: statusFilter === "All" ? undefined : statusFilter,
      page: targetPage,
      page_size: PAGE_SIZE,
    })
      .then((res) => {
        const body = res.data;
        setEmployees(Array.isArray(body?.data) ? body.data : []);
        setTotalRecords(body?.pagination?.total_records ?? 0);
        setTotalPages(Math.max(1, body?.pagination?.total_pages ?? 1));
        setPage(body?.pagination?.current_page ?? targetPage);
      })
      .catch(() => setError("Couldn't load employees. Please try again."))
      .finally(() => setLoading(false));
  };

  const loadSummary = () => {
    getEmployeeSummary(orgId)
      .then((res) => setSummary(res.data))
      .catch(() => setSummary(null));
  };

  useEffect(() => {
    const timer = setTimeout(() => loadEmployees(1), 300);
    return () => clearTimeout(timer);
  }, [query, statusFilter, orgId]);
  const summaryLoadedForOrgRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (summaryLoadedForOrgRef.current === orgId) return;
    summaryLoadedForOrgRef.current = orgId;
    loadSummary();
  }, [orgId]);

  const goToPage = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, nextPage));
    if (clamped === page) return;
    loadEmployees(clamped);
  };

  const handleToggleHold = async (emp: Employee) => {
    if (busyRow === emp.employee_id) return;
    const puttingOnHold = emp.status !== "On Hold";
    const next: EmployeeStatus = puttingOnHold ? "On Hold" : "Active";

    const ok = await confirm({
      title: puttingOnHold ? "Put employee on hold?" : "Reactivate employee?",
      message: puttingOnHold ? (
        <>
          Put <strong>{emp.employee_name}</strong> on hold? They won't be assignable to the
          queue or new appointments until reactivated.
        </>
      ) : (
        <>
          Reactivate <strong>{emp.employee_name}</strong>? They'll be available for the queue
          and new appointments again.
        </>
      ),
      variant: puttingOnHold ? "danger" : "default",
      confirmText: puttingOnHold ? "Put on hold" : "Reactivate",
    });
    if (!ok) return;

    setBusyRow(emp.employee_id);
    try {
      await setEmployeeStatus(emp.employee_id, next);
      loadEmployees();
      loadSummary();
      setToast({
        type: "success",
        message: puttingOnHold ? "Employee put on hold." : "Employee reactivated.",
      });
    } catch {
      setToast({ type: "error", message: "Couldn't update employee status." });
    } finally {
      setBusyRow(null);
    }
  };

  const handleDelete = async (emp: Employee) => {
    if (busyRow === emp.employee_id) return;
    const ok = await confirm({
      title: "Remove employee?",
      message: (
        <>
          Remove <strong>{emp.employee_name}</strong>? This marks them Inactive.
        </>
      ),
      variant: "danger",
      confirmText: "Remove",
    });
    if (!ok) return;
    setBusyRow(emp.employee_id);
    try {
      await deleteEmployee(emp.employee_id);
      loadEmployees();
      loadSummary();
      setToast({ type: "success", message: "Employee removed." });
    } catch {
      setToast({ type: "error", message: "Couldn't remove this employee." });
    } finally {
      setBusyRow(null);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    setExporting(true);
    setExportAnchor(null);
    try {
      const params = {
        search: query.trim() || undefined,
        status: statusFilter === "All" ? undefined : statusFilter,
      };
      if (format === "csv") await exportEmployeesCsv(orgId, params);
      else if (format === "excel") await exportEmployeesExcel(orgId, params);
      else await exportEmployeesPdf(orgId, params);
    } catch {
      setToast({ type: "error", message: "Export failed. Please try again." });
    } finally {
      setExporting(false);
    }
  };

  const rangeStart = totalRecords === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalRecords);

  const summaryTiles = [
    { label: "Total employees", value: summary?.totalEmployees ?? "-", color: SUMMARY_COLORS.total, icon: <UsersIcon fontSize="small" /> },
    { label: "Active", value: summary?.activeEmployees ?? "-", color: SUMMARY_COLORS.active, icon: <CheckCircleIcon fontSize="small" /> },
    { label: "On hold", value: summary?.onHoldEmployees ?? "-", color: SUMMARY_COLORS.onHold, icon: <PauseCircleIcon fontSize="small" /> },
    { label: "Inactive", value: summary?.inactiveEmployees ?? "-", color: SUMMARY_COLORS.inactive, icon: <CancelIcon fontSize="small" /> },
  ];

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5 }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          alignItems: "flex-start",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
            Employees
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage staff, designations and shifts.
          </Typography>
        </Box>
        <Tooltip title={isReadOnly ? blockedReason() ?? "" : employeeLimit.reached ? "Employee limit reached" : ""}>
          <span>
            <Button
              variant="contained"
              startIcon={<AddIcon fontSize="small" />}
              disabled={isReadOnly}
              onClick={async () => {
                if (isReadOnly) return;
                if (employeeLimit.reached) {
                  const shouldUpgrade = await confirm({
                    title: "Employee limit reached",
                    message: (
                      <>
                        You've reached your plan's limit of {employeeLimit.limit} employee
                        {employeeLimit.limit === 1 ? "" : "s"}. Upgrade your plan to add more employees.
                      </>
                    ),
                    confirmText: "Upgrade Plan",
                    cancelText: "Maybe later",
                  });
                  if (shouldUpgrade) setShowUpgrade(true);
                  return;
                }
                setShowAddModal(true);
              }}
            >
              Add employee
            </Button>
          </span>
        </Tooltip>
      </Box>
      {!isReadOnly && employeeLimit.reached && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            px: 2.5,
            py: 1.25,
            mb: 3,
            borderRadius: 2,
            bgcolor: "warning.light",
            color: "#7C4A03",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            You've reached your plan's limit of {employeeLimit.limit} employee{employeeLimit.limit === 1 ? "" : "s"}.
            Upgrade your plan to add more, or keep using your current plan as-is.
          </Typography>
          <Button
            size="small"
            variant="contained"
            color="warning"
            disableElevation
            startIcon={<UpgradeIcon fontSize="small" />}
            onClick={() => setShowUpgrade(true)}
            sx={{ flexShrink: 0 }}
          >
            Upgrade Plan
          </Button>
        </Box>
      )}

      {/* Summary */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2.25, mb: 3 }}>
        {summaryTiles.map((tile) => (
          <Card
            key={tile.label}
            elevation={0}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              p: 2.25,
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
                bgcolor: alpha(tile.color, 0.12),
                color: tile.color,
                flexShrink: 0,
              }}
            >
              {tile.icon}
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
                {tile.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {tile.label}
              </Typography>
            </Box>
          </Card>
        ))}
      </Box>

      {/* Toolbar + Table */}
      <Card
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          bgcolor: "background.paper",
          boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, justifyContent: "space-between", mb: 2.5 }}>
          <TextField
            size="small"
            placeholder="Search employees..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ width: { xs: "100%", sm: 320 }, bgcolor: "background.paper" }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<FilterIcon fontSize="small" />}
              onClick={(e) => setStatusAnchor(e.currentTarget)}
            >
              {statusFilter === "All" ? "All statuses" : statusFilter}
            </Button>
            <Menu
              anchorEl={statusAnchor}
              open={Boolean(statusAnchor)}
              onClose={() => setStatusAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 160, mt: 0.5 } } }}
            >
              {STATUS_FILTERS.map((s) => (
                <MenuItem
                  key={s}
                  selected={statusFilter === s}
                  onClick={() => {
                    setStatusFilter(s);
                    setStatusAnchor(null);
                  }}
                >
                  {s === "All" ? "All statuses" : s}
                </MenuItem>
              ))}
            </Menu>

            <Button
              variant="outlined"
              color="inherit"
              startIcon={<DownloadIcon fontSize="small" />}
              disabled={exporting}
              onClick={(e) => setExportAnchor(e.currentTarget)}
            >
              {exporting ? "Exporting..." : "Export"}
            </Button>
            <ExportMenu anchorEl={exportAnchor} onClose={() => setExportAnchor(null)} onExport={handleExport} />
          </Box>
        </Box>

        {loading ? (
          <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
            Loading employees...
          </Typography>
        ) : error ? (
          <Typography color="error" sx={{ py: 6, textAlign: "center" }}>
            {error}
          </Typography>
        ) : employees.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <UsersIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
              No employees found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {query ? `No employees match "${query}".` : "Add your first employee to get started."}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", bgcolor: "background.default" } }}>
                    <TableCell>Name</TableCell>
                    <TableCell>Designation</TableCell>
                    <TableCell>Mobile</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Shift</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.employee_id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark", fontWeight: 700, fontSize: 13 }}>
                            {getInitials(emp.employee_name)}
                          </Avatar>
                          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                            {emp.employee_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{emp.designation}</TableCell>
                      <TableCell>{emp.mobile}</TableCell>
                      <TableCell>{emp.email}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={<ScheduleIcon fontSize="small" />}
                          label={emp.shift_name || "Unassigned"}
                          variant="outlined"
                          color={(emp.shift_name || "").toLowerCase() === "general" ? "info" : "default"}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={emp.status} color={statusChipColor(emp.status)} sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                          <Tooltip title={isReadOnly ? blockedReason() ?? "" : emp.status === "On Hold" ? "Reactivate" : "Put on hold"}>
                            <span>
                              <IconButton
                                size="small"
                                color="warning"
                                disabled={isReadOnly || busyRow === emp.employee_id}
                                onClick={() => handleToggleHold(emp)}
                              >
                                {emp.status === "On Hold" ? <PlayIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={isReadOnly ? blockedReason() ?? "" : "Edit"}>
                            <span>
                              <IconButton
                                size="small"
                                color="primary"
                                disabled={isReadOnly}
                                onClick={() => setEditingEmployeeId(emp.employee_id)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title={isReadOnly ? blockedReason() ?? "" : "Remove"}>
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={isReadOnly || busyRow === emp.employee_id}
                                onClick={() => handleDelete(emp)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", justifyContent: "space-between", mt: 2.5 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {rangeStart}-{rangeEnd} of {totalRecords}
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Button size="small" disabled={page === 1 || loading} onClick={() => goToPage(1)} sx={{ minWidth: 36, px: 1 }}>
                  <FirstPageIcon fontSize="small" />
                </Button>
                <Button size="small" disabled={page === 1 || loading} onClick={() => goToPage(page - 1)} sx={{ minWidth: 36, px: 1 }}>
                  <ChevronLeftIcon fontSize="small" />
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                  Page {page} of {totalPages}
                </Typography>
                <Button size="small" disabled={page === totalPages || loading} onClick={() => goToPage(page + 1)} sx={{ minWidth: 36, px: 1 }}>
                  <ChevronRightIcon fontSize="small" />
                </Button>
                <Button size="small" disabled={page === totalPages || loading} onClick={() => goToPage(totalPages)} sx={{ minWidth: 36, px: 1 }}>
                  <LastPageIcon fontSize="small" />
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Card>

      {showAddModal && (
        <AddEmployee
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            loadEmployees(1);
            loadSummary();
            setToast({ type: "success", message: "Employee added." });
          }}
        />
      )}

      {editingEmployeeId !== null && (
        <EditEmployee
          employeeId={editingEmployeeId}
          onClose={() => setEditingEmployeeId(null)}
          onUpdated={() => {
            setEditingEmployeeId(null);
            loadEmployees();
            loadSummary();
            setToast({ type: "success", message: "Employee updated." });
          }}
        />
      )}

      {showUpgrade && (
        <RenewPlanDialog
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          organizationName={orgName}
          onRenewed={() => {
            refetchPlan();
            setToast({ type: "success", message: "Plan updated." });
          }}
          title="Upgrade your plan"
          subtitle="Pick a plan with a higher employee limit to keep adding staff."
          confirmLabel="Upgrade Now"
        />
      )}
    </Box>
  );
};

export default EmployeesPage;