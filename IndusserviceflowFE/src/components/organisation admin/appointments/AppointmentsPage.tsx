import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import {
  Box,
  Typography,
  Card,
  Stack,
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
  TableSortLabel,
  Avatar,
  Paper,
  IconButton,
  Tooltip,
  Alert,
  Dialog,
  DialogContent,
  Popover,
  Chip,
  alpha,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Inbox as InboxIcon,
  Event as EventIcon,
  CalendarMonth as DateRangeIcon,
  SupportAgent as WalkInIcon,
  EventAvailable as ConfirmedIcon,
  AccessTime as WaitingIcon,
  Autorenew as InProgressIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelledIcon,
  PersonOff as NoShowIcon,
  Logout as LeftQueueIcon,
  Block as BlockIcon,
  Close as CloseIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import ExportMenu from "../../common/ExportMenu";
import type { ExportFormat } from "../../common/ExportMenu";
import {
  getAppointments,
  getAppointmentSummary,
  getAppointmentType,
  exportAppointmentsCsv,
  exportAppointmentsExcel,
  exportAppointmentsPdf,
  cancelAppointment,
} from "../../../services/appointmentService";
import type {
  Appointment,
  AppointmentStatus,
  AppointmentSummary,
} from "../../../services/appointmentService";
import CreateAppointment from "./CreateAppointment";
import { useConfirm } from "../../common/ConfirmDialog";

const PAGE_SIZE = 10;
const REFRESH_MS = 20000;

type AppointmentType = "Scheduled" | "Walk-in";
type ChipColor = "default" | "warning" | "info" | "success" | "error" | "secondary";

const TYPE_FILTERS: Array<AppointmentType | "All types"> = ["All types", "Scheduled", "Walk-in"];

const STATUS_FILTERS: Array<AppointmentStatus | "All statuses"> = [
  "All statuses",
  "Confirmed",
  "Waiting",
  "In Progress",
  "Completed",
  "Cancelled",
  "No Show",
  "Left Queue",
];

const STATUS_COLOR: Record<AppointmentStatus, ChipColor> = {
  Confirmed: "info",
  Waiting: "warning",
  "In Progress": "info",
  Completed: "success",
  Cancelled: "error",
  "No Show": "default",
  "Left Queue": "default",
};

// Same chip-with-icon treatment as the Customers page's status column, so
// an appointment's status reads consistently wherever it's shown.
const STATUS_ICON: Record<AppointmentStatus, ReactElement> = {
  Confirmed: <ConfirmedIcon fontSize="small" />,
  Waiting: <WaitingIcon fontSize="small" />,
  "In Progress": <InProgressIcon fontSize="small" />,
  Completed: <CheckCircleIcon fontSize="small" />,
  Cancelled: <CancelledIcon fontSize="small" />,
  "No Show": <NoShowIcon fontSize="small" />,
  "Left Queue": <LeftQueueIcon fontSize="small" />,
};

const CANCELLABLE_STATUSES: AppointmentStatus[] = ["Confirmed", "Waiting", "In Progress"];

type SortKey = "token_number" | "customer_name" | "date" | "time";
type SortDir = "asc" | "desc";

const formatDate = (iso: string) => {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${y}-${m}-${d}`;
};

const formatTime = (t: string) => (t ? t.slice(0, 5) : "-");

const getInitial = (name: string) => (name ? name.trim().charAt(0).toUpperCase() : "?");

const LiveDot = () => (
  <Box
    sx={{
      width: 7,
      height: 7,
      borderRadius: "50%",
      bgcolor: "success.main",
      "@keyframes livePulse": {
        "0%": { boxShadow: "0 0 0 0 rgba(5,150,105,0.55)" },
        "70%": { boxShadow: "0 0 0 5px rgba(5,150,105,0)" },
        "100%": { boxShadow: "0 0 0 0 rgba(5,150,105,0)" },
      },
      animation: "livePulse 2s infinite",
    }}
  />
);

const AppointmentsPage = () => {
  const confirm = useConfirm();
  const orgId = localStorage.getItem("org_id") || undefined;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [summary, setSummary] = useState<AppointmentSummary | null>(null);
  const [typeCounts, setTypeCounts] = useState<{ scheduled: number; walkIn: number }>({ scheduled: 0, walkIn: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setRefreshTick] = useState(0);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AppointmentType | "All types">("All types");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "All statuses">("All statuses");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);
  const [typeAnchor, setTypeAnchor] = useState<null | HTMLElement>(null);
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);
  const [dateAnchor, setDateAnchor] = useState<null | HTMLElement>(null);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const loadAppointments = (
    targetPage = page,
    opts: { silent?: boolean; includeCounts?: boolean } = {}
  ) => {
    const { silent = false } = opts;
    if (!silent) setLoading(true);
    if (!silent) setError(null);

    if (fromDate && toDate && fromDate > toDate) {
      setDateRangeError('"From" date must be on or before the "To" date.');
      if (!silent) setLoading(false);
      return;
    }
    setDateRangeError(null);

    const baseParams = {
      search: query.trim() || undefined,
      status: statusFilter === "All statuses" ? undefined : statusFilter,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
    };
    const { includeCounts = true } = opts;

    const listRequest = getAppointments(orgId, {
      ...baseParams,
      type: typeFilter === "All types" ? undefined : typeFilter,
      page: targetPage,
      page_size: PAGE_SIZE,
      sort_by: sort.key,
      sort_dir: sort.dir,
    });
    const countsRequest = includeCounts
      ? getAppointments(orgId, { ...baseParams, page_size: 1000 })
      : null;

    Promise.all([listRequest, countsRequest])
      .then(([res, countsRes]) => {
        const body = res.data;
        setAppointments(Array.isArray(body?.data) ? body.data : []);
        setTotalRecords(body?.pagination?.total_records ?? 0);
        setTotalPages(Math.max(1, body?.pagination?.total_pages ?? 1));
        setPage(body?.pagination?.current_page ?? targetPage);
        if (countsRes) {
          const all = Array.isArray(countsRes.data?.data) ? countsRes.data.data : [];
          const scheduled = all.reduce(
            (n, a) => n + (getAppointmentType(a) === "Scheduled" ? 1 : 0),
            0
          );
          setTypeCounts({ scheduled, walkIn: all.length - scheduled });
        }
        setLastUpdated(new Date());
      })
      .catch(() => {
        if (!silent) setError("Couldn't load appointments. Please try again.");
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  const loadSummary = () => {
    getAppointmentSummary(orgId)
      .then((res) => setSummary(res.data))
      .catch(() => setSummary(null));
  };

  useEffect(() => {
    const timer = setTimeout(() => loadAppointments(1), 300);
    return () => clearTimeout(timer);
  }, [query, statusFilter, typeFilter, fromDate, toDate, sort, orgId]);
  const summaryLoadedForOrgRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (summaryLoadedForOrgRef.current === orgId) return;
    summaryLoadedForOrgRef.current = orgId;
    loadSummary();
  }, [orgId]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadAppointments(page, { silent: true });
      loadSummary();
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [query, statusFilter, typeFilter, fromDate, toDate, sort, orgId, page]);
  useEffect(() => {
    const ticker = setInterval(() => setRefreshTick((t) => t + 1), 20000);
    return () => clearInterval(ticker);
  }, []);

  const updatedLabel = useMemo(() => {
    if (!lastUpdated) return null;
    const seconds = Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000));
    if (seconds < 5) return "Updated just now";
    if (seconds < 60) return `Updated ${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    return `Updated ${minutes}m ago`;
  }, [lastUpdated]);

  const withType = useMemo(
    () => appointments.map((a) => ({ ...a, type: getAppointmentType(a) as AppointmentType })),
    [appointments]
  );

  // An appointment can bundle several services (e.g. haircut + shave) into
  // one booking. For display purposes each service line is shown as its own
  // appointment row rather than stacking all services inside a single row,
  // so the table reads as one row per service instead of one row per
  // booking. Actions (like cancel) still act on the parent appointment.
  type FlatAppointmentRow = Appointment & {
    type: AppointmentType;
    rowKey: string;
    serviceName: string;
    employeeName: string;
    rowTime: string;
    rowStatus: AppointmentStatus;
  };

  const flatRows: FlatAppointmentRow[] = useMemo(() => {
    const rows: FlatAppointmentRow[] = [];
    withType.forEach((a) => {
      if (a.services && a.services.length > 0) {
        a.services.forEach((svc) => {
          rows.push({
            ...a,
            rowKey: `${a.appointment_id}-${svc.appointment_service_id}`,
            serviceName: svc.service_name,
            employeeName: svc.employee_name ?? "Unassigned",
            rowTime: svc.start_time ?? a.time,
            rowStatus: (svc.status as AppointmentStatus) ?? a.status,
          });
        });
      } else {
        rows.push({
          ...a,
          rowKey: `${a.appointment_id}`,
          serviceName: "-",
          employeeName: "-",
          rowTime: a.time,
          rowStatus: a.status,
        });
      }
    });
    return rows;
  }, [withType]);

  const statusCount = (status: AppointmentStatus) =>
    summary?.statusBreakdown.find((s) => s.status === status)?.count ?? 0;
  const goToPage = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, nextPage));
    if (clamped === page || loading) return;
    loadAppointments(clamped, { includeCounts: false });
  };

  const toggleSort = (key: SortKey) => {
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  };

  const handleExport = async (format: ExportFormat) => {
    setExporting(true);
    setExportAnchor(null);
    try {
      const params = {
        search: query.trim() || undefined,
        status: statusFilter === "All statuses" ? undefined : statusFilter,
        type: typeFilter === "All types" ? undefined : typeFilter,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      };
      if (format === "csv") await exportAppointmentsCsv(orgId, params);
      else if (format === "excel") await exportAppointmentsExcel(orgId, params);
      else await exportAppointmentsPdf(orgId, params);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleCancel = async (appointment: Appointment) => {
    const ok = await confirm({
      title: "Cancel appointment?",
      message: (
        <>
          Cancel appointment <strong>{appointment.token_number}</strong> for{" "}
          <strong>{appointment.customer_name}</strong>?
        </>
      ),
      variant: "danger",
      confirmText: "Yes, cancel",
      cancelText: "No, keep it",
    });
    if (!ok) return;
    setCancellingId(appointment.appointment_id);
    try {
      await cancelAppointment(appointment.appointment_id);
      loadAppointments(page);
      loadSummary();
    } catch {
      setError("Couldn't cancel this appointment. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  const rangeStart = totalRecords === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalRecords);

  const summaryTiles = [
    { label: "Total appointments", value: summary?.totalAppointments ?? totalRecords, color: "#0F766E", icon: <InboxIcon fontSize="small" /> },
    { label: "Scheduled", value: typeCounts.scheduled, color: "#0284C7", icon: <EventIcon fontSize="small" /> },
    { label: "Walk-in", value: typeCounts.walkIn, color: "#D97706", icon: <WalkInIcon fontSize="small" /> },
    { label: "Confirmed", value: statusCount("Confirmed"), color: "#2563EB", icon: <ConfirmedIcon fontSize="small" /> },
    { label: "Completed", value: statusCount("Completed"), color: "#16A34A", icon: <CheckCircleIcon fontSize="small" /> },
    { label: "Cancelled", value: statusCount("Cancelled"), color: "#DC2626", icon: <CancelledIcon fontSize="small" /> },
    { label: "No Show", value: statusCount("No Show"), color: "#B91C1C", icon: <NoShowIcon fontSize="small" /> },
    { label: "Left Queue", value: statusCount("Left Queue"), color: "#64748B", icon: <LeftQueueIcon fontSize="small" /> },
  ];

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5 }}>
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
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.25 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
              Appointments
            </Typography>
            <Stack direction="row" spacing={0.6} sx={{ alignItems: "center", pl: 0.5 }}>
              <LiveDot />
              <Typography variant="caption" sx={{ color: "success.dark", fontWeight: 700, letterSpacing: 0.3 }}>
                LIVE
              </Typography>
            </Stack>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Track, update and export every booking for your organization.
            {updatedLabel ? ` · ${updatedLabel}` : ""}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon fontSize="small" />} onClick={() => setShowAddModal(true)}>
          Add appointment
        </Button>
      </Box>

      {/* Summary */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          gap: 2.25,
          mb: 3,
        }}
      >
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

      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {error}
        </Alert>
      )}

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
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
          <TextField
            size="small"
            placeholder="Search appointments..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ width: { xs: "100%", sm: 260 }, bgcolor: "background.paper" }}
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

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<FilterIcon fontSize="small" />}
              onClick={(e) => setTypeAnchor(e.currentTarget)}
            >
              {typeFilter}
            </Button>
            <Menu
              anchorEl={typeAnchor}
              open={Boolean(typeAnchor)}
              onClose={() => setTypeAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 150, mt: 0.5 } } }}
            >
              {TYPE_FILTERS.map((t) => (
                <MenuItem
                  key={t}
                  selected={typeFilter === t}
                  onClick={() => {
                    setTypeFilter(t);
                    setTypeAnchor(null);
                  }}
                >
                  {t}
                </MenuItem>
              ))}
            </Menu>

            <Button
              variant="outlined"
              color="inherit"
              startIcon={<FilterIcon fontSize="small" />}
              onClick={(e) => setStatusAnchor(e.currentTarget)}
            >
              {statusFilter}
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
                  {s}
                </MenuItem>
              ))}
            </Menu>

            <Button
              variant="outlined"
              color="inherit"
              startIcon={<DateRangeIcon fontSize="small" />}
              onClick={(e) => setDateAnchor(e.currentTarget)}
            >
              {fromDate || toDate ? `${fromDate || "\u2026"} \u2192 ${toDate || "\u2026"}` : "Date range"}
            </Button>
            <Popover
              open={Boolean(dateAnchor)}
              anchorEl={dateAnchor}
              onClose={() => setDateAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{ paper: { sx: { borderRadius: 2, mt: 0.5, p: 2 } } }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: "flex-end" }}>
                <TextField
                  type="date"
                  size="small"
                  label="From"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ width: 160 }}
                />
                <TextField
                  type="date"
                  size="small"
                  label="To"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: fromDate || undefined } }}
                  sx={{ width: 160 }}
                />
                {(fromDate || toDate) && (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                  >
                    Clear
                  </Button>
                )}
              </Stack>
            </Popover>

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

        {dateRangeError && (
          <Alert severity="warning" sx={{ mb: 2.5 }} onClose={() => setDateRangeError(null)}>
            {dateRangeError}
          </Alert>
        )}

        {loading ? (
          <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
            Loading appointments...
          </Typography>
        ) : flatRows.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <InboxIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
              No appointments found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {query ? `No appointments match "${query}".` : "Book your first appointment to get started."}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", bgcolor: "background.default" } }}>
                    <TableCell sortDirection={sort.key === "token_number" ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.key === "token_number"}
                        direction={sort.key === "token_number" ? sort.dir : "asc"}
                        onClick={() => toggleSort("token_number")}
                      >
                        Token
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={sort.key === "customer_name" ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.key === "customer_name"}
                        direction={sort.key === "customer_name" ? sort.dir : "asc"}
                        onClick={() => toggleSort("customer_name")}
                      >
                        Customer
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Service</TableCell>
                    <TableCell>Employee</TableCell>
                    <TableCell sortDirection={sort.key === "date" ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.key === "date"}
                        direction={sort.key === "date" ? sort.dir : "asc"}
                        onClick={() => toggleSort("date")}
                      >
                        Date
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sortDirection={sort.key === "time" ? sort.dir : false}>
                      <TableSortLabel
                        active={sort.key === "time"}
                        direction={sort.key === "time" ? sort.dir : "asc"}
                        onClick={() => toggleSort("time")}
                      >
                        Time
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {flatRows.map((a) => (
                    <TableRow
                      key={a.rowKey}
                      hover
                      sx={{
                        "& td": { borderBottom: "1px solid", borderColor: "divider", py: 1.75 },
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700, fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                        {a.token_number}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark", fontWeight: 700, fontSize: 13 }}>
                            {getInitial(a.customer_name)}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                              {a.customer_name}
                            </Typography>
                            <Typography
                              variant="caption"
                              noWrap
                              sx={{ display: "block", color: a.type === "Walk-in" ? "warning.dark" : "info.dark" }}
                            >
                              {a.type}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {a.serviceName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {a.employeeName}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(a.date)}</TableCell>
                      <TableCell sx={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace" }}>
                        <Typography variant="body2" noWrap sx={{ whiteSpace: "nowrap", fontFamily: "inherit" }}>
                          {formatTime(a.rowTime)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          icon={STATUS_ICON[a.rowStatus]}
                          label={a.rowStatus}
                          color={STATUS_COLOR[a.rowStatus]}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {CANCELLABLE_STATUSES.includes(a.rowStatus) && (
                          <Tooltip title="Cancel appointment">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={cancellingId === a.appointment_id}
                                onClick={() => handleCancel(a)}
                              >
                                <BlockIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", justifyContent: "space-between", mt: 2.5 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {rangeStart}-{rangeEnd} of {totalRecords}
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Button size="small" disabled={page === 1} onClick={() => goToPage(1)} sx={{ minWidth: 36, px: 1 }}>
                  <FirstPageIcon fontSize="small" />
                </Button>
                <Button size="small" disabled={page === 1} onClick={() => goToPage(page - 1)} sx={{ minWidth: 36, px: 1 }}>
                  <ChevronLeftIcon fontSize="small" />
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                  Page {page} of {totalPages}
                </Typography>
                <Button size="small" disabled={page === totalPages} onClick={() => goToPage(page + 1)} sx={{ minWidth: 36, px: 1 }}>
                  <ChevronRightIcon fontSize="small" />
                </Button>
                <Button size="small" disabled={page === totalPages} onClick={() => goToPage(totalPages)} sx={{ minWidth: 36, px: 1 }}>
                  <LastPageIcon fontSize="small" />
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Card>
      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        maxWidth="md"
        fullWidth
        scroll="paper"
        slotProps={{ paper: { sx: { borderRadius: 3, overflow: "hidden" } } }}
      >
        <IconButton
          onClick={() => setShowAddModal(false)}
          aria-label="Close"
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 1,
            bgcolor: "background.paper",
            boxShadow: "0 2px 8px rgba(15,23,42,0.12)",
            "&:hover": { bgcolor: "background.paper" },
          }}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <DialogContent sx={{ p: 0 }}>
          <CreateAppointment
            embedded
            onClose={() => setShowAddModal(false)}
            onBooked={() => {
              loadAppointments(1);
              loadSummary();
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AppointmentsPage;