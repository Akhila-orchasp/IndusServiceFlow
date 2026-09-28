import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Alert,
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
  Snackbar,
  Paper,
} from "@mui/material";
import {
  Download as DownloadIcon,
  PeopleAlt as PeopleIcon,
  EventAvailable as EventAvailableIcon,
  AccessTime as AccessTimeIcon,
  Queue as QueueIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { getOrgReport, exportOrgReport } from "../../../services/organisationservice";
import { useAuth } from "../../../context/AuthContext";
import type { OrgReportData } from "../../../types";
import ExportMenu from "../../common/ExportMenu";
import type { ExportFormat } from "../../common/ExportMenu";

const TEAL = "#0F766E";
const BORDER = "#E2E8F0";
const TEXT = "#0F172A";
const MUTED = "#64748B";
const CHART_COLORS = ["#0F766E", "#2563EB", "#D97706", "#16A34A", "#DC2626", "#7C3AED"];


const ReportCard = ({ title, children, sx = {} }: { title: string; children: ReactNode; sx?: object }) => (
  <Card
    elevation={0}
    sx={{
      borderRadius: 3,
      bgcolor: "background.paper",
      border: `1px solid ${BORDER}`,
      boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
      ...sx,
    }}
  >
    <CardContent sx={{ p: { xs: 2, sm: 2.5 }, "&:last-child": { pb: { xs: 2, sm: 2.5 } } }}>
      <Typography sx={{ fontSize: 15, fontWeight: 700, color: TEXT, mb: 2, fontFamily: "'Sora', sans-serif" }}>
        {title}
      </Typography>
      {children}
    </CardContent>
  </Card>
);

const SummaryCard = ({ label, value, icon, color }: { label: string; value: string | number; icon: ReactNode; color: string }) => (
  <Card
    elevation={0}
    sx={{
      minHeight: 112,
      borderRadius: 3,
      bgcolor: "background.paper",
      border: `1px solid ${BORDER}`,
      boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
      transition: "transform .2s ease, box-shadow .2s ease",
      "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 20px rgba(15,23,42,0.09)" },
    }}
  >
    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box sx={{ width: 44, height: 44, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: alpha(color, 0.12), color, flexShrink: 0 }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 23, lineHeight: 1.1, fontWeight: 700, color: TEXT, fontFamily: "'Sora', sans-serif" }}>{value}</Typography>
          <Typography sx={{ mt: .45, fontSize: 12, color: MUTED }}>{label}</Typography>
        </Box>
      </Stack>
    </CardContent>
  </Card>
);

const MetricCard = ({ label, value }: { label: string; value: string | number }) => (
  <Box sx={{ p: 1.75, borderRadius: 2.5, bgcolor: "#F8FAFC", border: `1px solid ${BORDER}` }}>
    <Typography sx={{ fontSize: 11.5, color: MUTED, mb: .6 }}>{label}</Typography>
    <Typography sx={{ fontSize: 19, fontWeight: 700, color: TEXT }}>{value}</Typography>
  </Box>
);

export default function OrganizationReports() {
  const { orgId } = useAuth();
  const resolvedOrgId = orgId || localStorage.getItem("org_id") || "";
  const [data, setData] = useState<OrgReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [dateRangeError, setDateRangeError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [exportStatus, setExportStatus] = useState<{ type: "loading" | "success" | "error"; msg: string } | null>(null);

  const loadReport = useCallback(async (silent = false) => {
    if (!resolvedOrgId) {
      setError("Organization ID is missing.");
      return;
    }
    if (fromDate && toDate && fromDate > toDate) {
      setDateRangeError('"From" date must be on or before the "To" date.');
      return;
    }
    setDateRangeError("");
    setLoading(true);
    setError("");
    try {
      const response = await getOrgReport(resolvedOrgId, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setData(response.data?.data ?? null);
    } catch {
      if (!silent) setError("Couldn't load organization reports. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [resolvedOrgId, fromDate, toDate]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleExport = async (format: ExportFormat) => {
    setExportAnchor(null);
    if (!resolvedOrgId) return;
    if (fromDate && toDate && fromDate > toDate) {
      setDateRangeError('"From" date must be on or before the "To" date.');
      return;
    }
    const label = format === "excel" ? "Excel" : format.toUpperCase();
    setExporting(true);
    setExportStatus({ type: "loading", msg: `Preparing ${label} download...` });
    try {
      const blob = await exportOrgReport(resolvedOrgId, format, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      downloadBlob(blob, `organization_${resolvedOrgId}_report.${format === "excel" ? "xlsx" : format}`);
      setExportStatus({ type: "success", msg: `${label} report downloaded successfully.` });
    } catch {
      setExportStatus({ type: "error", msg: `Failed to download ${label} report.` });
    } finally {
      setExporting(false);
      window.setTimeout(() => setExportStatus(null), 3500);
    }
  };

  const statusRows = data?.appointment_summary?.status_breakdown ?? [];
  const peakHourRows = data?.peak_booking_hours ?? [];
  const staffRows = data?.staff_performance ?? [];
  const probabilityRows = data ? [
    { name: "Arrival probability", value: Number(data.service_probability.arrival_probability) || 0 },
    { name: "Service probability", value: Number(data.service_probability.service_probability) || 0 },
  ] : [];
  const waitTrendRows = data?.wait_time_trend ?? [];
  const hasWaitTrendData = waitTrendRows.length > 0;
  const avgWaitOverall = hasWaitTrendData
    ? Math.round((waitTrendRows.reduce((sum, r) => sum + (Number(r.avg_wait_min) || 0), 0) / waitTrendRows.length) * 10) / 10
    : 0;
  const longestWaitDay = hasWaitTrendData
    ? waitTrendRows.reduce((max, r) => (Number(r.avg_wait_min) || 0) > (Number(max.avg_wait_min) || 0) ? r : max, waitTrendRows[0])
    : null;

  const chartGrid = { stroke: "#E2E8F0", strokeDasharray: "3 3" };
  const axis = { tick: { fill: MUTED, fontSize: 11 }, axisLine: false, tickLine: false };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5, bgcolor: "#F8FAFC", minHeight: "100%" }}>
      {/* Same page-header pattern used across Org Admin pages */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif", color: TEXT }}>
            Reports & Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor organization performance, customer flow, queues and staff activity in real time.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, alignItems: "center", justifyContent: "flex-end" }}>
          <TextField
            size="small" type="date" label="From" value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: toDate || undefined } }}
            sx={{ width: { xs: "100%", sm: 155 }, "& .MuiOutlinedInput-root": { borderRadius: 2 }, bgcolor: "#fff" }}
          />
          <TextField
            size="small" type="date" label="To" value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: fromDate || undefined } }}
            sx={{ width: { xs: "100%", sm: 155 }, "& .MuiOutlinedInput-root": { borderRadius: 2 }, bgcolor: "#fff" }}
          />
          {(fromDate || toDate) && (
            <Button color="inherit" onClick={() => { setFromDate(""); setToDate(""); }} sx={{ textTransform: "none", fontWeight: 600 }}>
              Clear
            </Button>
          )}
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<DownloadIcon fontSize="small" />}
            disabled={exporting}
            onClick={(e) => setExportAnchor(e.currentTarget)}
            sx={{ textTransform: "none", fontWeight: 700, borderColor: "#CBD5E1", bgcolor: "#fff", color: TEXT, "&:hover": { bgcolor: "#F8FAFC", borderColor: "#94A3B8" } }}
          >
            {exporting ? "Exporting..." : "Export"}
          </Button>
          <ExportMenu anchorEl={exportAnchor} onClose={() => setExportAnchor(null)} onExport={handleExport} />
        </Box>
      </Box>

      {dateRangeError && <Alert severity="warning" sx={{ mb: 2.5 }}>{dateRangeError}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

      {loading && !data ? (
        <Box sx={{ minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Stack alignItems="center" spacing={1.25}><CircularProgress size={30} sx={{ color: TEAL }} /><Typography color="text.secondary" fontSize={13}>Loading reports...</Typography></Stack>
        </Box>
      ) : data ? (
        <Stack spacing={2.5}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)", md: "repeat(3,1fr)", lg: "repeat(6,1fr)" }, gap: 2 }}>
            <SummaryCard label="Total appointments" value={data.appointment_summary.total_appointments} color={TEAL} icon={<EventAvailableIcon fontSize="small" />} />
            <SummaryCard label="Customers" value={data.dashboard_analytics.patients_today} color="#0284C7" icon={<PeopleIcon fontSize="small" />} />
            <SummaryCard label="Customers served" value={data.dashboard_analytics.patients_served} color="#16A34A" icon={<CheckCircleIcon fontSize="small" />} />
            <SummaryCard label="Active queue" value={data.dashboard_analytics.active_queue} color="#D97706" icon={<QueueIcon fontSize="small" />} />
            <SummaryCard label="Peak booking hour" value={data.dashboard_analytics.peak_hour || "N/A"} color="#7C3AED" icon={<AccessTimeIcon fontSize="small" />} />
            <SummaryCard label="Staff utilization" value={`${data.dashboard_analytics.employee_utilization}%`} color="#2563EB" icon={<TrendingUpIcon fontSize="small" />} />
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2.5 }}>
            <ReportCard title="Appointment status breakdown">
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusRows} dataKey="count" nameKey="status" cx="50%" cy="45%" outerRadius={92} innerRadius={52} paddingAngle={2}>
                      {statusRows.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </ReportCard>

            <ReportCard title="Peak booking hours">
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={peakHourRows} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                    <CartesianGrid {...chartGrid} />
                    <XAxis dataKey="hour" {...axis} />
                    <YAxis allowDecimals={false} {...axis} />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="count" name="Bookings" stroke={TEAL} fill={alpha(TEAL, .16)} strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </ReportCard>
          </Box>

          <ReportCard title="Staff performance">
            <Box sx={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffRows} margin={{ top: 8, right: 12, left: -12, bottom: 12 }}>
                  <CartesianGrid {...chartGrid} />
                  <XAxis dataKey="employee" {...axis} />
                  <YAxis allowDecimals={false} {...axis} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="total_assigned" name="Assigned" fill="#2563EB" radius={[5,5,0,0]} maxBarSize={48} />
                  <Bar dataKey="completed" name="Completed" fill="#16A34A" radius={[5,5,0,0]} maxBarSize={48} />
                  <Bar dataKey="cancelled" name="Cancelled" fill="#DC2626" radius={[5,5,0,0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </ReportCard>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2.5 }}>
            <ReportCard title="Service probability analytics">
              <Box sx={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={probabilityRows} margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
                    <CartesianGrid {...chartGrid} />
                    <XAxis dataKey="name" {...axis} />
                    <YAxis {...axis} />
                    <RechartsTooltip />
                    <Bar dataKey="value" name="Probability" fill="#3bafd9" radius={[6,6,0,0]} maxBarSize={48} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3,1fr)" }, gap: 1.25 }}>
                <MetricCard label="Arrival probability" value={data.service_probability.arrival_probability ?? "N/A"} />
                <MetricCard label="Service probability" value={data.service_probability.service_probability ?? "N/A"} />
                <MetricCard label="Simulation status" value={data.service_probability.simulation_status ?? "N/A"} />
              </Box>
            </ReportCard>

            <ReportCard title="Average wait time trend">
              <Box sx={{ height: 280 }}>
                {hasWaitTrendData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={waitTrendRows} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
                      <CartesianGrid {...chartGrid} />
                      <XAxis dataKey="date" {...axis} />
                      <YAxis allowDecimals={false} {...axis} />
                      <RechartsTooltip formatter={(value: number) => [`${value} min`, "Avg wait"]} />
                      <Area type="monotone" dataKey="avg_wait_min" name="Avg wait (min)" stroke="#D97706" fill={alpha("#D97706", .16)} strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Typography fontSize={13} color="text.secondary">No wait time data recorded in this period</Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.25 }}>
                <MetricCard label="Average wait time" value={hasWaitTrendData ? `${avgWaitOverall} min` : "N/A"} />
                <MetricCard label="Longest wait day" value={longestWaitDay ? `${longestWaitDay.date} (${longestWaitDay.avg_wait_min} min)` : "N/A"} />
              </Box>
            </ReportCard>
          </Box>
        </Stack>
      ) : null}

      <Snackbar open={Boolean(exportStatus)} autoHideDuration={3500} onClose={() => setExportStatus(null)} anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        {exportStatus ? <Alert severity={exportStatus.type === "success" ? "success" : exportStatus.type === "error" ? "error" : "info"} icon={exportStatus.type === "loading" ? <CircularProgress size={18} color="inherit" /> : undefined}>{exportStatus.msg}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}