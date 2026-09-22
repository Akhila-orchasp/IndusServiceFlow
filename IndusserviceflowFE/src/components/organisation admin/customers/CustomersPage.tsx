import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
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
  Paper,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Dialog,
  DialogContent,
  Divider,
  alpha,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Groups as UsersIcon,
  AccessTime as ClockIcon,
  Autorenew as InServiceIcon,
  CheckCircle as CheckCircleIcon,
  History as HistoryIcon,
  Close as CloseIcon,
  EventAvailable as VisitsIcon,
  Block as CancelledIcon,
  ReportProblem as NoShowIcon,
  CurrencyRupee as RupeeIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import ExportMenu from "../../common/ExportMenu";
import type { ExportFormat } from "../../common/ExportMenu";
import {
  getCustomers,
  getCustomerSummary,
  exportCustomersCsv,
  exportCustomersExcel,
  exportCustomersPdf,
  getCustomerHistory,
  exportCustomerHistoryCsv,
  exportCustomerHistoryExcel,
  exportCustomerHistoryPdf,
} from "../../../services/customerService";
import type { Customer, CustomerHistory, CustomerSummary } from "../../../services/customerService";
import { getAppointments } from "../../../services/appointmentService";
import type { Appointment, AppointmentStatus } from "../../../services/appointmentService";

const PAGE_SIZE = 10;

type ChipColor = "default" | "warning" | "info" | "success" | "error" | "secondary";

const STATUS_BUCKETS: Record<AppointmentStatus, { label: string; color: ChipColor; icon: ReactElement }> = {
  Confirmed: { label: "Waiting", color: "warning", icon: <ClockIcon fontSize="small" /> },
  Waiting: { label: "Waiting", color: "warning", icon: <ClockIcon fontSize="small" /> },
  "In Progress": { label: "In service", color: "info", icon: <InServiceIcon fontSize="small" /> },
  Completed: { label: "Served", color: "success", icon: <CheckCircleIcon fontSize="small" /> },
  Cancelled: { label: "Cancelled", color: "error", icon: <ClockIcon fontSize="small" /> },
  "No Show": { label: "No Show", color: "error", icon: <ClockIcon fontSize="small" /> },
  "Left Queue": { label: "Left Queue", color: "default", icon: <ClockIcon fontSize="small" /> },
};

const APPT_STATUS_COLOR: Record<AppointmentStatus, ChipColor> = {
  Confirmed: "warning",
  Waiting: "warning",
  "In Progress": "info",
  Completed: "success",
  Cancelled: "error",
  "No Show": "error",
  "Left Queue": "default",
};

const STATUS_FILTERS = ["All statuses", "Waiting", "In service", "Served"];

const getInitial = (name: string) => (name ? name.trim().charAt(0).toUpperCase() : "?");

const formatCurrency = (value: number) =>
  `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const formatDate = (value: string | null) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const SUMMARY_COLORS = {
  total: "#0F766E",
  waiting: "#D97706",
  inService: "#0284C7",
  served: "#16A34A",
};

interface CustomerRow extends Customer {
  serviceName: string | null;
  bucketLabel: string | null;
  bucketColor: ChipColor | null;
  bucketIcon: ReactElement | null;
}

const CustomersPage = () => {
  const orgId = localStorage.getItem("org_id") || undefined;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setRefreshTick] = useState(0);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  // View History modal state
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [historyData, setHistoryData] = useState<CustomerHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyExportAnchor, setHistoryExportAnchor] = useState<null | HTMLElement>(null);
  const [historyExporting, setHistoryExporting] = useState(false);

  const loadCustomers = (targetPage = page, opts: { silent?: boolean } = {}) => {
    const { silent = false } = opts;
    if (!silent) setLoading(true);
    if (!silent) setError(null);

    getCustomers(orgId, {
      search: query.trim() || undefined,
      status: statusFilter === "All statuses" ? undefined : statusFilter,
      page: targetPage,
      page_size: PAGE_SIZE,
    })
      .then((customersRes) => {
        const body = customersRes.data;
        setCustomers(Array.isArray(body?.data) ? body.data : []);
        setTotalRecords(body?.pagination?.total_records ?? 0);
        setTotalPages(Math.max(1, body?.pagination?.total_pages ?? 1));
        setPage(body?.pagination?.current_page ?? targetPage);
        setLastUpdated(new Date());
      })
      .catch(() => {
        if (!silent) setError("Couldn't load customers. Please try again.");
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  const loadSummary = () => {
    getCustomerSummary(orgId, query.trim() || undefined)
      .then((res) => setSummary(res.data))
      .catch(() => setSummary(null));
  };
  const loadAppointmentsForBuckets = () => {
    getAppointments(orgId, { page_size: 200 })
      .then((res) => setAppointments(Array.isArray(res.data?.data) ? res.data.data : []))
      .catch(() => {});
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers(1);
      loadSummary();
    }, 350);
    return () => clearTimeout(timer);
  }, [query, statusFilter, orgId]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadCustomers(page, { silent: true });
      loadSummary();
    }, 30000);
    return () => clearInterval(interval);
  }, [query, statusFilter, orgId, page]);
  const bucketsFetchedForOrgRef = useRef<string | number | undefined>(undefined);
  useEffect(() => {
    if (bucketsFetchedForOrgRef.current !== orgId) {
      bucketsFetchedForOrgRef.current = orgId;
      loadAppointmentsForBuckets();
    }
    const interval = setInterval(loadAppointmentsForBuckets, 30000);
    return () => clearInterval(interval);
  }, [orgId]);
  useEffect(() => {
    const ticker = setInterval(() => setRefreshTick((t) => t + 1), 30000);
    return () => clearInterval(ticker);
  }, []);

  const goToPage = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, nextPage));
    if (clamped === page || loading) return;
    loadCustomers(clamped);
  };

  const updatedLabel = useMemo(() => {
    if (!lastUpdated) return null;
    const seconds = Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000));
    if (seconds < 5) return "Updated just now";
    if (seconds < 60) return `Updated ${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    return `Updated ${minutes}m ago`;
  }, [lastUpdated]);

  const latestAppointmentByCustomer = useMemo(() => {
    const map = new Map<number, Appointment>();
    for (const appt of appointments) {
      const existing = map.get(appt.customer);
      if (!existing || appt.appointment_id > existing.appointment_id) {
        map.set(appt.customer, appt);
      }
    }
    return map;
  }, [appointments]);

  const rows: CustomerRow[] = useMemo(() => {
    return customers.map((c) => {
      const appt = latestAppointmentByCustomer.get(c.CustomerId);
      const bucket = appt ? STATUS_BUCKETS[appt.status] : null;
      return {
        ...c,
        serviceName: appt?.services?.[0]?.service_name ?? null,
        bucketLabel: bucket?.label ?? null,
        bucketColor: bucket?.color ?? null,
        bucketIcon: bucket?.icon ?? null,
      };
    });
  }, [customers, latestAppointmentByCustomer]);

  const handleExport = async (format: ExportFormat) => {
    setExporting(true);
    setExportAnchor(null);
    try {
      const search = query.trim() || undefined;
      if (format === "csv") await exportCustomersCsv(orgId, search);
      else if (format === "excel") await exportCustomersExcel(orgId, search);
      else await exportCustomersPdf(orgId, search);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const openHistory = (customer: Customer) => setHistoryCustomer(customer);

  const closeHistory = () => {
    setHistoryCustomer(null);
    setHistoryData(null);
    setHistoryError(null);
    setHistoryExportAnchor(null);
  };

  const handleHistoryExport = async (format: ExportFormat) => {
    if (!historyCustomer) return;

    setHistoryExporting(true);
    setHistoryExportAnchor(null);

    try {
      if (format === "csv") await exportCustomerHistoryCsv(historyCustomer.CustomerId, historyCustomer.CustomerName);
      else if (format === "excel") await exportCustomerHistoryExcel(historyCustomer.CustomerId, historyCustomer.CustomerName);
      else await exportCustomerHistoryPdf(historyCustomer.CustomerId, historyCustomer.CustomerName);
    } catch {
      setHistoryError("Export failed. Please try again.");
    } finally {
      setHistoryExporting(false);
    }
  };

  useEffect(() => {
    if (!historyCustomer) return;

    setHistoryLoading(true);
    setHistoryError(null);
    setHistoryData(null);

    getCustomerHistory(historyCustomer.CustomerId)
      .then((res) => setHistoryData(res.data))
      .catch(() => setHistoryError("Couldn't load this customer's history. Please try again."))
      .finally(() => setHistoryLoading(false));
  }, [historyCustomer]);

  const rangeStart = totalRecords === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalRecords);

  const summaryTiles = [
    { label: "Total customers", value: summary?.totalCustomers ?? 0, color: SUMMARY_COLORS.total, icon: <UsersIcon fontSize="small" /> },
    { label: "Waiting", value: summary?.waiting ?? 0, color: SUMMARY_COLORS.waiting, icon: <ClockIcon fontSize="small" /> },
    { label: "In service", value: summary?.inService ?? 0, color: SUMMARY_COLORS.inService, icon: <InServiceIcon fontSize="small" /> },
    { label: "Served", value: summary?.served ?? 0, color: SUMMARY_COLORS.served, icon: <CheckCircleIcon fontSize="small" /> },
  ];

  const historyStatTiles = historyData
    ? [
        { label: "Total visits", value: historyData.stats.totalAppointments, color: "#0F766E", icon: <VisitsIcon fontSize="small" /> },
        { label: "Completed", value: historyData.stats.completed, color: "#16A34A", icon: <CheckCircleIcon fontSize="small" /> },
        { label: "Cancelled", value: historyData.stats.cancelled, color: "#DC2626", icon: <CancelledIcon fontSize="small" /> },
        { label: "No show", value: historyData.stats.noShow, color: "#D97706", icon: <NoShowIcon fontSize="small" /> },
        { label: "Total spent", value: formatCurrency(historyData.stats.totalSpent), color: "#0284C7", icon: <RupeeIcon fontSize="small" /> },
      ]
    : [];

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.25 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
            Customers
          </Typography>
          <Stack direction="row" spacing={0.6} sx={{ alignItems: "center", pl: 0.5 }}>
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
            <Typography variant="caption" sx={{ color: "success.dark", fontWeight: 700, letterSpacing: 0.3 }}>
              LIVE
            </Typography>
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Customer records associated with your organization.
          {updatedLabel ? ` · ${updatedLabel}` : ""}
        </Typography>
      </Box>

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
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, justifyContent: "space-between", mb: 2.5 }}>
          <TextField
            size="small"
            placeholder="Search customers..."
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
            Loading customers...
          </Typography>
        ) : rows.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <UsersIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
              No customers found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {query ? `No customers match "${query}".` : "No customers yet."}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", bgcolor: "background.default" } }}>
                    <TableCell>Name</TableCell>
                    <TableCell>Mobile</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Gender</TableCell>
                    <TableCell>Service</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.CustomerId} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark", fontWeight: 700, fontSize: 13 }}>
                            {getInitial(c.CustomerName)}
                          </Avatar>
                          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                            {c.CustomerName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{c.Mobile}</TableCell>
                      <TableCell>{c.Email || "-"}</TableCell>
                      <TableCell>{c.Gender || "-"}</TableCell>
                      <TableCell>{c.serviceName || "-"}</TableCell>
                      <TableCell>
                        {c.bucketLabel ? (
                          <Chip
                            size="small"
                            icon={c.bucketIcon ?? undefined}
                            label={c.bucketLabel}
                            color={c.bucketColor ?? "default"}
                            sx={{ fontWeight: 600 }}
                          />
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="View history">
                          <IconButton size="small" color="primary" onClick={() => openHistory(c)}>
                            <HistoryIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
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

      {/* View History modal */}
      <Dialog
        open={Boolean(historyCustomer)}
        onClose={closeHistory}
        maxWidth="sm"
        fullWidth
        scroll="paper"
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        {historyCustomer && (
          <DialogContent dividers sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Avatar sx={{ width: 44, height: 44, bgcolor: "primary.light", color: "primary.dark", fontWeight: 700 }}>
                  {getInitial(historyCustomer.CustomerName)}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {historyCustomer.CustomerName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {historyCustomer.Mobile}
                    {historyCustomer.Email ? ` · ${historyCustomer.Email}` : ""}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Tooltip title="Export history">
                  <span>
                    <IconButton
                      size="small"
                      disabled={historyExporting || !historyData || historyData.appointments.length === 0}
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
                  First visit {formatDate(historyData.stats.firstVisit)} · Last visit{" "}
                  {formatDate(historyData.stats.lastVisit)}
                </Typography>

                <Divider sx={{ mb: 2 }} />

                <Stack spacing={1.5}>
                  {historyData.appointments.length === 0 && (
                    <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                      No appointments yet.
                    </Typography>
                  )}

                  {historyData.appointments.map((appt) => (
                    <Card key={appt.appointment_id} elevation={0} variant="outlined" sx={{ p: 1.75, borderRadius: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatDate(appt.date)} · {appt.time?.slice(0, 5)}
                        </Typography>
                        <Chip size="small" label={appt.status} color={APPT_STATUS_COLOR[appt.status]} sx={{ fontWeight: 600 }} />
                      </Box>

                      <Stack spacing={0.5} sx={{ mb: 1 }}>
                        {appt.services.length === 0 && (
                          <Typography variant="caption" color="text.secondary">
                            No services recorded
                          </Typography>
                        )}
                        {appt.services.map((svc) => (
                          <Box
                            key={svc.appointment_service_id}
                            sx={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}
                          >
                            <Typography variant="body2">
                              {svc.service_name}
                              {svc.employee_name && (
                                <Typography component="span" variant="caption" color="text.secondary">
                                  {" "}
                                  · {svc.employee_name}
                                </Typography>
                              )}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatCurrency(Number(svc.fee))}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>

                      <Divider sx={{ mb: 1 }} />

                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="caption" color="text.secondary">
                          Appointment #{appt.appointment_number}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700 }}>
                          {formatCurrency(Number(appt.total_fee))} total
                        </Typography>
                      </Box>
                    </Card>
                  ))}
                </Stack>
              </>
            )}
          </DialogContent>
        )}
      </Dialog>
    </Box>
  );
};

export default CustomersPage;