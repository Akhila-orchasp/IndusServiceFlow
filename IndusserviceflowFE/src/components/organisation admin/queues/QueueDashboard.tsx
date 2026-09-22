import { useEffect, useMemo, useRef, useState } from "react";
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
  Alert,
  alpha,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  AccessTime as ClockIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Groups as UsersIcon,
  PhoneDisabled as PhoneDisabledIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import ExportMenu from "../../common/ExportMenu";
import type { ExportFormat } from "../../common/ExportMenu";
import {
  getQueueSummary,
  getActiveQueues,
  getLiveQueue,
  getQueueServices,
  exportQueueCsv,
  exportQueueExcel,
  exportQueuePdf,
} from "../../../services/queueService";
import type {
  QueueSummary,
  ActiveQueue,
  LiveQueueRow,
  QueueServiceOption,
} from "../../../services/queueService";

const PAGE_SIZE = 5;
const REFRESH_MS = 12000;

type ChipColor = "default" | "warning" | "info" | "success" | "error" | "secondary";

const STATUS_COLOR: Record<string, ChipColor> = {
  Confirmed: "info",
  Waiting: "warning",
  "In Progress": "info",
  Completed: "success",
  Cancelled: "error",
  "No Show": "default",
  "Left Queue": "default",
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? "";
  const second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + second).toUpperCase() || "?";
};

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

const QueueDashboard = () => {
  const orgId = localStorage.getItem("org_id") || undefined;

  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [activeQueues, setActiveQueues] = useState<ActiveQueue[]>([]);
  const [liveQueue, setLiveQueue] = useState<LiveQueueRow[]>([]);
  const [services, setServices] = useState<QueueServiceOption[]>([]);

  const [loadingCards, setLoadingCards] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setRefreshTick] = useState(0);

  const [query, setQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState<QueueServiceOption | null>(null);
  const [serviceAnchor, setServiceAnchor] = useState<null | HTMLElement>(null);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [exporting, setExporting] = useState(false);

  const dedupeActiveQueues = (rows: ActiveQueue[]): ActiveQueue[] => {
    const bySer = new Map<number, ActiveQueue>();
    rows.forEach((row) => {
      const existing = bySer.get(row.service_id);
      if (!existing) {
        bySer.set(row.service_id, row);
        return;
      }
      if (!existing.currently_serving?.token_number && row.currently_serving?.token_number) {
        bySer.set(row.service_id, row);
      }
    });
    return Array.from(bySer.values());
  };

  const loadCards = (opts: { silent?: boolean } = {}) => {
    const { silent = false } = opts;
    if (!silent) setLoadingCards(true);
    Promise.all([getQueueSummary(orgId), getActiveQueues(orgId)])
      .then(([summaryRes, activeRes]) => {
        setSummary(summaryRes.data);
        setActiveQueues(dedupeActiveQueues(Array.isArray(activeRes.data) ? activeRes.data : []));
        setLastUpdated(new Date());
      })
      .catch(() => {
        if (!silent) setError("Couldn't load the live queues. Please try again.");
      })
      .finally(() => {
        if (!silent) setLoadingCards(false);
      });
  };
  const loadTable = (targetPage = page, opts: { silent?: boolean } = {}) => {
    const { silent = false } = opts;
    if (!silent) setLoadingTable(true);

    getLiveQueue(orgId, {
      search: query.trim() || undefined,
      service_id: serviceFilter?.service_id,
      page: targetPage,
      page_size: PAGE_SIZE,
    })
      .then((res) => {
        const body = res.data;
        setLiveQueue(Array.isArray(body?.data) ? body.data : []);
        setTotalRecords(body?.pagination?.total_records ?? 0);
        setTotalPages(Math.max(1, body?.pagination?.total_pages ?? 1));
        setPage(body?.pagination?.current_page ?? targetPage);
        setLastUpdated(new Date());
      })
      .catch(() => {
        if (!silent) setError("Couldn't load the live queue table. Please try again.");
      })
      .finally(() => {
        if (!silent) setLoadingTable(false);
      });
  };
  const initialLoadForOrgRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (initialLoadForOrgRef.current === orgId) return;
    initialLoadForOrgRef.current = orgId;
    loadCards();
    getQueueServices(orgId)
      .then((res) => setServices(Array.isArray(res.data) ? res.data : []))
      .catch(() => setServices([]));
  }, [orgId]);

  useEffect(() => {
    const timer = setTimeout(() => loadTable(1), 300);
    return () => clearTimeout(timer);
  }, [query, serviceFilter]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadCards({ silent: true });
      loadTable(page, { silent: true });
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [orgId, query, serviceFilter, page]);
  useEffect(() => {
    const ticker = setInterval(() => setRefreshTick((t) => t + 1), 15000);
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

  const handleExport = async (format: ExportFormat) => {
    setExporting(true);
    setExportAnchor(null);
    try {
      if (format === "csv") await exportQueueCsv(orgId);
      else if (format === "excel") await exportQueueExcel(orgId);
      else await exportQueuePdf(orgId);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const goToPage = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, nextPage));
    if (clamped === page || loadingTable) return;
    loadTable(clamped);
  };

  const activeServiceCount = summary?.active_services ?? activeQueues.length;

  const rangeStart = totalRecords === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalRecords);

  const summaryTiles = [
    { label: "Total waiting", value: summary?.total_waiting ?? 0, color: "#D97706", icon: <ClockIcon fontSize="small" /> },
    { label: "Currently serving", value: summary?.currently_serving ?? 0, color: "#0284C7", icon: <TrendingUpIcon fontSize="small" /> },
    { label: "Completed", value: summary?.completed_today ?? 0, color: "#16A34A", icon: <CheckCircleIcon fontSize="small" /> },
    { label: "Services", value: activeServiceCount, color: "#0F766E", icon: <UsersIcon fontSize="small" /> },
  ];

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.25 }}>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
            Queue management
          </Typography>
          <Stack direction="row" spacing={0.6} sx={{ alignItems: "center", pl: 0.5 }}>
            <LiveDot />
            <Typography variant="caption" sx={{ color: "success.dark", fontWeight: 700, letterSpacing: 0.3 }}>
              LIVE
            </Typography>
          </Stack>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Monitor and control every service queue across your organization.
          {updatedLabel ? ` · ${updatedLabel}` : ""}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {error}
        </Alert>
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

      {/* Active queues */}
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", mb: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Active queues
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {activeQueues.length} with activity
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
          gap: 2.25,
          mb: 3.5,
        }}
      >
        {loadingCards && activeQueues.length === 0 && (
          <Card elevation={0} sx={{ p: 2.5, borderRadius: 3, boxShadow: "0 4px 14px rgba(15,23,42,0.06)" }}>
            <Typography color="text.secondary">Loading queues...</Typography>
          </Card>
        )}

        {!loadingCards && activeQueues.length === 0 && (
          <Card elevation={0} sx={{ p: 2.5, borderRadius: 3, boxShadow: "0 4px 14px rgba(15,23,42,0.06)" }}>
            <Typography color="text.secondary">No active queues yet today.</Typography>
          </Card>
        )}

        {activeQueues.map((q) => {
          const isServing = Boolean(q.currently_serving?.token_number);
          return (
            <Card
              key={q.service_id}
              elevation={0}
              sx={{
                p: 2.25,
                borderRadius: 3,
                bgcolor: "background.paper",
                boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.75 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                  {q.service_name}
                </Typography>
                <Chip
                  size="small"
                  icon={<LiveDot />}
                  label="Live"
                  sx={{
                    bgcolor: alpha("#16A34A", 0.12),
                    color: "success.dark",
                    fontWeight: 700,
                    "& .MuiChip-icon": { ml: "8px" },
                  }}
                />
              </Box>

              {isServing ? (
                <>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                    Now serving
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                    <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark", fontWeight: 700, fontSize: 13 }}>
                      {getInitials(q.currently_serving.customer_name)}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {q.currently_serving.customer_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Token #{q.currently_serving.token_number}
                      </Typography>
                    </Box>
                  </Box>
                </>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    color: "text.secondary",
                    py: 2,
                    mb: 2,
                  }}
                >
                  <PhoneDisabledIcon fontSize="small" />
                  <Typography variant="body2">Not serving anyone yet.</Typography>
                </Box>
              )}

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 1.5,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: "background.default",
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Waiting
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {q.waiting_count}
                </Typography>
              </Box>
            </Card>
          );
        })}
      </Box>

      {/* Live queue table */}
      <Card
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          bgcolor: "background.paper",
          boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
        }}
      >
        <Box sx={{ mb: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Live queue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {totalRecords} appointment{totalRecords === 1 ? "" : "s"} across {activeServiceCount} services
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, justifyContent: "space-between", mb: 2.5 }}>
          <TextField
            size="small"
            placeholder="Search customer or token..."
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
              onClick={(e) => setServiceAnchor(e.currentTarget)}
            >
              {serviceFilter ? serviceFilter.service_name : "All services"}
            </Button>
            <Menu
              anchorEl={serviceAnchor}
              open={Boolean(serviceAnchor)}
              onClose={() => setServiceAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 180, mt: 0.5 } } }}
            >
              <MenuItem
                selected={!serviceFilter}
                onClick={() => {
                  setServiceFilter(null);
                  setServiceAnchor(null);
                }}
              >
                All services
              </MenuItem>
              {services.map((s) => (
                <MenuItem
                  key={s.service_id}
                  selected={serviceFilter?.service_id === s.service_id}
                  onClick={() => {
                    setServiceFilter(s);
                    setServiceAnchor(null);
                  }}
                >
                  {s.service_name}
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

        {loadingTable ? (
          <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
            Loading queue...
          </Typography>
        ) : liveQueue.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <UsersIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
              No appointments in the queue
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {query ? `No appointments match "${query}".` : "Nothing is queued right now."}
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", bgcolor: "background.default" } }}>
                    <TableCell>Token</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Service</TableCell>
                    <TableCell>Employee</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {liveQueue.map((row) => (
                    <TableRow key={row.appointment_id} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{row.token_number}</TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark", fontWeight: 700, fontSize: 13 }}>
                            {getInitials(row.customer_name)}
                          </Avatar>
                          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                            {row.customer_name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{row.service_name}</TableCell>
                      <TableCell>{row.employee_name ?? "-"}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.status}
                          color={STATUS_COLOR[row.status] ?? "default"}
                          sx={{ fontWeight: 600 }}
                        />
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
                <Button size="small" disabled={page === 1 || loadingTable} onClick={() => goToPage(1)} sx={{ minWidth: 36, px: 1 }}>
                  <FirstPageIcon fontSize="small" />
                </Button>
                <Button size="small" disabled={page === 1 || loadingTable} onClick={() => goToPage(page - 1)} sx={{ minWidth: 36, px: 1 }}>
                  <ChevronLeftIcon fontSize="small" />
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                  Page {page} of {totalPages}
                </Typography>
                <Button size="small" disabled={page === totalPages || loadingTable} onClick={() => goToPage(page + 1)} sx={{ minWidth: 36, px: 1 }}>
                  <ChevronRightIcon fontSize="small" />
                </Button>
                <Button size="small" disabled={page === totalPages || loadingTable} onClick={() => goToPage(totalPages)} sx={{ minWidth: 36, px: 1 }}>
                  <LastPageIcon fontSize="small" />
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Card>
    </Box>
  );
};

export default QueueDashboard;