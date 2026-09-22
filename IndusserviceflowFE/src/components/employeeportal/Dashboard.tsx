import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Card, Typography, Stack, CircularProgress, Alert } from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  AccessTime as ClockIcon,
  Groups as UsersIcon,
  EventAvailable as CalendarIcon,
} from "@mui/icons-material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { getEmployeeDashboard } from "../../services/employeeService";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);
const CONTENT_KEYFRAMES = {
  "@keyframes pageFadeUp": {
    from: { opacity: 0, transform: "translateY(16px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
};

interface AssignedService {
  appointment_id: number;
  token_number: string;
  customer_name: string;
  service_name: string;
  time: string;
  appointment_status: string;
  service_status: string;
}

interface DashboardData {
  customers_served_today: number;
  customers_waiting: number;
  average_handling_time: number;
  completed_services_today: number;
  in_progress_services: number;
  upcoming_appointments_today: number;
  assigned_services_today: AssignedService[];
  shift: {
    shift_name: string;
    start_time: string;
    end_time: string;
    status: string;
  } | null;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const formatTime = (t: string) => {
  const [hStr, mStr] = t.split(":");
  const hour = parseInt(hStr, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${mStr} ${suffix}`;
};
const panelSx = {
  p: 3,
  borderRadius: 3,
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 1px 2px rgba(14,60,97,0.06)",
};
const REFRESH_MS = 20000;

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

export default function Dashboard() {
  const employeeId = localStorage.getItem("employee_id");
  const employeeName = localStorage.getItem("name") || "Employee";

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      loadDashboard();
    }
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard({ silent: true });
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const ticker = setInterval(() => setRefreshTick((t) => t + 1), 15000);
    return () => clearInterval(ticker);
  }, []);

  const loadDashboard = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    try {
      const response = await getEmployeeDashboard(employeeId!);
      setDashboard(response.data.data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Failed to load employee dashboard:", err);
      if (!silent) setError("Couldn't load your dashboard. Please try again.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const updatedLabel = useMemo(() => {
    if (!lastUpdated) return null;
    const seconds = Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000));
    if (seconds < 5) return "Updated just now";
    if (seconds < 60) return `Updated ${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    return `Updated ${minutes}m ago`;
  }, [lastUpdated, refreshTick]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!dashboard) {
    return (
      <Box sx={{ px: { xs: 2, md: 4 }, py: 6, textAlign: "center" }}>
        <Typography color="text.secondary">Could not load dashboard. Please try again later.</Typography>
      </Box>
    );
  }

  const completedRows = dashboard.assigned_services_today
    .filter((row) => row.service_status === "Completed")
    .sort((a, b) => a.time.localeCompare(b.time));

  const chartLabels = completedRows.map((row) => formatTime(row.time));
  const chartValues = completedRows.map((_, index) => index + 1);

  const remaining = dashboard.assigned_services_today
    .filter((row) => ["Confirmed", "Waiting", "In Progress"].includes(row.appointment_status))
    .sort((a, b) => a.time.localeCompare(b.time));

  const cards = [
    {
      title: "Customers Served Today",
      value: dashboard.customers_served_today,
      icon: <CheckCircleIcon fontSize="small" />,
      color: "#059669",
      subtitle: "Completed appointments today",
    },
    {
      title: "Average Handling Time",
      value: `${dashboard.average_handling_time}m`,
      icon: <ClockIcon fontSize="small" />,
      color: "#0369A1",
      subtitle: "Based on today's completed tasks",
    },
    {
      title: "Customers Waiting",
      value: dashboard.customers_waiting,
      icon: <UsersIcon fontSize="small" />,
      color: "#6D28D9",
      subtitle: "In your queue right now",
    },
    {
      title: "Upcoming Appointments",
      value: dashboard.upcoming_appointments_today,
      icon: <CalendarIcon fontSize="small" />,
      color: "#D97706",
      subtitle: "Scheduled later today",
    },
  ];

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5, ...CONTENT_KEYFRAMES, animation: "pageFadeUp 0.45s cubic-bezier(0.22,1,0.36,1) forwards" }}>
      <Stack spacing={3}>
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.25 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {getGreeting()}, {employeeName}
            </Typography>
            <Stack direction="row" spacing={0.6} sx={{ alignItems: "center", pl: 0.5 }}>
              <LiveDot />
              <Typography variant="caption" sx={{ color: "success.dark", fontWeight: 700, letterSpacing: 0.3 }}>
                LIVE
              </Typography>
            </Stack>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Here's your day at a glance.
            {updatedLabel ? ` · ${updatedLabel}` : ""}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: -1 }}>
            {error}
          </Alert>
        )}

        {/* Summary cards */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" }, gap: 2.25 }}>
          {cards.map((card) => (
            <Card
              key={card.title}
              elevation={0}
              sx={{
                ...panelSx,
                position: "relative",
                overflow: "hidden",
                p: 2.5,
                transition: "transform .18s ease, box-shadow .18s ease",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
                },
              }}
            >
              <Box sx={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="overline" sx={{ letterSpacing: "0.06em", fontWeight: 600, lineHeight: 1.4, color: "text.secondary" }}>
                    {card.title}
                  </Typography>
                  <Typography variant="h5" sx={{ mt: 0.5, fontFamily: "'Sora', sans-serif", fontWeight: 700 }}>
                    {card.value}
                  </Typography>
                  <Typography variant="caption" sx={{ display: "block", mt: 0.75, color: "text.secondary", fontWeight: 500 }}>
                    {card.subtitle}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: `${card.color}1A`,
                    color: card.color,
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </Box>
              </Box>
            </Card>
          ))}
        </Box>

        {/* Handling time + remaining schedule */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.4fr 1fr" }, gap: 2.5 }}>
          <Card elevation={0} sx={panelSx}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>
              Today's Handling Time
            </Typography>
            <Box sx={{ height: 280, mt: 1 }}>
              {chartValues.length > 0 ? (
                <Line
                  data={{
                    labels: chartLabels,
                    datasets: [
                      {
                        label: "Customers Served",
                        data: chartValues,
                        borderColor: "#0EA5E9",
                        backgroundColor: (context: any) => {
                          const { ctx, chartArea } = context.chart;
                          if (!chartArea) return "rgba(14,165,233,0.25)";
                          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                          gradient.addColorStop(0, "rgba(14,165,233,0.35)");
                          gradient.addColorStop(1, "rgba(14,165,233,0.02)");
                          return gradient;
                        },
                        borderWidth: 2,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: { beginAtZero: true, ticks: { precision: 0, stepSize: 8 }, grid: { color: "#eef2f7" } },
                      x: { grid: { display: false } },
                    },
                  }}
                />
              ) : (
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                  <Typography variant="body2" color="text.secondary">
                    No completed services yet today.
                  </Typography>
                </Box>
              )}
            </Box>
          </Card>

          <Card elevation={0} sx={{ ...panelSx, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Remaining Schedule Today
            </Typography>

            {remaining.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                No more appointments scheduled today.
              </Typography>
            ) : (
              <Stack spacing={1} sx={{ overflowY: "auto", maxHeight: 300 }}>
                {remaining.map((row) => (
                  <Box
                    key={row.appointment_id}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      px: 1.5,
                      py: 1.25,
                      borderRadius: 2,
                      bgcolor: "background.default",
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                        {row.customer_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {row.service_name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.dark", flexShrink: 0, pl: 1 }}>
                      {formatTime(row.time)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Card>
        </Box>
      </Stack>
    </Box>
  );
}