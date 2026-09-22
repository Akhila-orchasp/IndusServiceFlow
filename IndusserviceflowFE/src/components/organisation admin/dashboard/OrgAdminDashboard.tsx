import { useCallback, useEffect, useRef, useState } from "react";

import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Fade,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import BarChartIcon from "@mui/icons-material/BarChart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { getOrgDashboard } from "../../../services/organisationservice";

import { useAuth } from "../../../context/AuthContext";

import type { OrgDashboardData, OrgDashboardStats } from "../../../types";

/* =========================================================
   DEFAULT DATA
========================================================= */

const EMPTY_STATS: OrgDashboardStats = {
  patients_today: 0,
  patients_served: 0,
  active_queue: 0,
  avg_wait_time: 0,
  max_wait_time: 0,
  queue_length: 0,
  employee_utilization: 0,
  peak_hour: "N/A",
  period_start: "",
  period_end: "",
};

const EMPTY: OrgDashboardData = {
  stats: EMPTY_STATS,

  queue_length_trend: [],
  service_distribution: [],
  wait_time_trend: [],
  employee_utilization: [],
  peak_hours: [],
  customer_flow: [],
  wait_distribution: [],
  queue_status: [],
};

/* =========================================================
   COLORS
========================================================= */

const COLORS = {
  text: "#1F2937",
  muted: "#64748B",
  border: "#D9E2F0",
  borderHover: "#93C5FD",
  primary: "#2563EB",
  background: "#F8FAFC",
};

/* =========================================================
   REFRESH INTERVAL (real-time polling)
========================================================= */

const AUTO_REFRESH_MS = 30000;

/* =========================================================
   DATE HELPERS
========================================================= */

function formatPeriodLabel(periodStart: string, periodEnd: string): string {
  if (!periodStart || !periodEnd) return "This month";
  const start = new Date(`${periodStart}T00:00:00`);
  const end = new Date(`${periodEnd}T00:00:00`);
  const sameMonth =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    ...(sameMonth ? {} : { year: "numeric" }),
  });
  const endLabel = end.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${startLabel} - ${endLabel}`;
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return "";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

/* =========================================================
   STAT CARD
   Reports page ke cards jaisa design
========================================================= */
function StatCard({
  icon,
  label,
  value,
  color,
  sub = "This month",
  live = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
  live?: boolean;
}) {
  return (
    <Card
      elevation={0}
      sx={{
        position: "relative",
        height: 128,
        borderRadius: "22px",
        backgroundColor: "#FFFFFF",
        color: COLORS.text,
        border: `1px solid ${COLORS.border}`,
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        transition: "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",

        "&:hover": {
          transform: "translateY(-4px)",
          borderColor: COLORS.borderHover,
          boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
        },
      }}
    >
      <CardContent
        sx={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          boxSizing: "border-box",
          p: "18px 20px !important",
        }}
      >
        {/* TOP */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{
            width: "100%",
          }}
        >
          {/* LABEL */}
          <Typography
            sx={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: COLORS.muted,
              textTransform: "uppercase",
              lineHeight: 1.35,
              maxWidth: "70%",
            }}
          >
            {label}
          </Typography>

          {/* ICON - RIGHT SIDE (only element that keeps colour) */}
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${color}1A`,
              color: color,
              flexShrink: 0,
              fontSize: 18,

              /* Force icon to right */
              ml: "auto",
            }}
          >
            {icon}
          </Box>
        </Stack>

        {/* VALUE */}
        <Typography
          sx={{
            mt: 1.4,
            fontSize: 28,
            lineHeight: 1,
            fontWeight: 800,
            color: COLORS.text,
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </Typography>

        {/* SUB TEXT */}
        <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mt: 0.75 }}>
          {live && (
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: color,
                animation: "pulseDot 1.6s ease-in-out infinite",
                "@keyframes pulseDot": {
                  "0%": { opacity: 1 },
                  "50%": { opacity: 0.35 },
                  "100%": { opacity: 1 },
                },
              }}
            />
          )}
          <Typography
            sx={{
              fontSize: 11,
              color: COLORS.muted,
              fontWeight: 500,
            }}
          >
            {sub}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

/* =========================================================
   CHART CARD
========================================================= */

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        minHeight: 225,

        boxSizing: "border-box",

        backgroundColor: "#FFFFFF",

        border: `1px solid ${COLORS.border}`,

        borderRadius: 3,

        p: 2.5,

        transition: "all 0.3s ease",

        "&:hover": {
          borderColor: COLORS.borderHover,

          boxShadow: "0 8px 24px rgba(37,99,235,0.10)",

          transform: "translateY(-2px)",
        },
      }}
    >
      <Typography
        sx={{
          fontSize: 15,

          fontWeight: 700,

          color: COLORS.text,

          mb: 2,
        }}
      >
        {title}
      </Typography>

      {children}
    </Paper>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function Empty() {
  return (
    <Box
      sx={{
        minHeight: 160,

        display: "flex",
        alignItems: "center",
        justifyContent: "center",

        textAlign: "center",

        color: COLORS.muted,

        fontSize: 13,
      }}
    >
      <Typography
        sx={{
          fontSize: 13,
          color: COLORS.muted,
        }}
      >
        No data available for today.
      </Typography>
    </Box>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

export default function OrgAdminDashboard() {
  const { orgId } = useAuth();

  const resolvedOrgId = orgId || localStorage.getItem("org_id") || "";

  const [data, setData] = useState<OrgDashboardData>(EMPTY);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [, forceTick] = useState(0);

  const hasLoadedOnce = useRef(false);

  /* =====================================================
       LOAD DASHBOARD
       silent = true -> background/auto refresh, no full-page
       spinner, so the page doesn't flicker every 30s.
    ===================================================== */

  const load = useCallback(async (silent = false) => {
    if (!resolvedOrgId) {
      setLoading(false);
      return;
    }

    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const res = await getOrgDashboard(resolvedOrgId);

      setData(res.data?.data ?? EMPTY);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load organization dashboard:", err);

      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      hasLoadedOnce.current = true;
    }
  }, [resolvedOrgId]);

  /* =====================================================
       INITIAL LOAD
    ===================================================== */

  useEffect(() => {
    load();
  }, [load]);

  /* =====================================================
       AUTO REFRESH (real-time polling)
    ===================================================== */

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (hasLoadedOnce.current) load(true);
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  /* =====================================================
       "x seconds ago" ticker for the last-updated label
    ===================================================== */

  useEffect(() => {
    const tick = window.setInterval(() => forceTick((n) => n + 1), 1000);
    return () => window.clearInterval(tick);
  }, []);

  /* =====================================================
       DATA
    ===================================================== */

  const {
    stats,
    queue_length_trend,
    service_distribution,
    employee_utilization,
    peak_hours,
    customer_flow,
    wait_distribution,
    queue_status,
  } = data;

  /* =====================================================
       LOADING
    ===================================================== */

  if (loading && !data.stats) {
    return (
      <Box
        sx={{
          minHeight: 400,

          display: "flex",

          alignItems: "center",

          justifyContent: "center",
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress
            size={42}
            thickness={4}
            sx={{
              color: COLORS.primary,
            }}
          />

          <Typography
            sx={{
              fontSize: 14,
              color: COLORS.muted,
            }}
          >
            Loading dashboard...
          </Typography>
        </Stack>
      </Box>
    );
  }

  /* =====================================================
       MAIN UI
    ===================================================== */

  return (
    <Fade in timeout={450}>
      <Box
        sx={{
          width: "100%",

          boxSizing: "border-box",

          p: {
            xs: 2,
            sm: 3,
          },

          backgroundColor: COLORS.background,
        }}
      >
        {/* =================================================
                    HEADER
                ================================================= */}

        <Stack
          direction={{
            xs: "column",
            md: "row",
          }}
          justifyContent="space-between"
          alignItems={{
            xs: "flex-start",
            md: "center",
          }}
          spacing={2}
          sx={{
            width: "100%",
            mb: 3,
          }}
        >
          <Box>
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Typography
                sx={{
                  fontSize: {
                    xs: 26,
                    sm: 30,
                  },

                  lineHeight: 1.2,

                  fontWeight: 700,

                  color: "#111827",
                }}
              >
                Dashboard
              </Typography>

              <Chip
                size="small"
                label="Live"
                icon={
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      backgroundColor: "#16A34A !important",
                      ml: "8px !important",
                      animation: "pulseLive 1.6s ease-in-out infinite",
                      "@keyframes pulseLive": {
                        "0%": { opacity: 1 },
                        "50%": { opacity: 0.35 },
                        "100%": { opacity: 1 },
                      },
                    }}
                  />
                }
                sx={{
                  height: 24,
                  fontWeight: 700,
                  fontSize: 11,
                  color: "#166534",
                  backgroundColor: "#DCFCE7",
                  border: "1px solid #BBF7D0",
                  "& .MuiChip-icon": { order: -1 },
                }}
              />
            </Stack>

            <Typography
              sx={{
                mt: 0.75,

                fontSize: 14,

                color: COLORS.muted,
              }}
            >
              {formatPeriodLabel(data.stats.period_start, data.stats.period_end)}
              {" · "}
              Real-time queue overview and monthly performance metrics.
            </Typography>

            {lastUpdated && (
              <Typography
                sx={{
                  mt: 0.35,
                  fontSize: 12,
                  color: "#94A3B8",
                }}
              >
                Updated {formatRelativeTime(lastUpdated)}
                {refreshing ? " · refreshing…" : ""}
              </Typography>
            )}
          </Box>
        </Stack>

        {/* =================================================
                    ERROR
                ================================================= */}

        {error && (
          <Alert
            severity="error"
            variant="outlined"
            sx={{
              mb: 3,

              borderRadius: 2,

              backgroundColor: "#FEF2F2",
            }}
          >
            {error}
          </Alert>
        )}

        {/* =================================================
                    STAT CARDS
                    4 CARDS PER ROW
                ================================================= */}

        <Grid
          container
          spacing={2}
          sx={{
            mb: 3,
          }}
        >
          {/* PATIENTS TODAY */}

          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 3,
            }}
          >
            <StatCard
              icon={<PeopleAltIcon />}
              label="Customers"
              value={stats.patients_today}
              color="#2563EB"
              sub="This month"
            />
          </Grid>

          {/* PATIENTS SERVED */}

          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 3,
            }}
          >
            <StatCard
              icon={<CheckCircleIcon />}
              label="Customers Served"
              value={stats.patients_served}
              color="#16A34A"
              sub="This month"
            />
          </Grid>

          {/* ACTIVE QUEUE */}

          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 3,
            }}
          >
            <StatCard
              icon={<HourglassBottomIcon />}
              label="Active Queue"
              value={stats.active_queue}
              color="#F59E0B"
              sub="Live now"
              live
            />
          </Grid>

          {/* AVG WAIT TIME */}

          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 3,
            }}
          >
            <StatCard
              icon={<AccessTimeIcon />}
              label="Avg Wait Time"
              value={`${stats.avg_wait_time} min`}
              color="#7C3AED"
              sub="This month"
            />
          </Grid>

          {/* MAX WAIT TIME */}

          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 3,
            }}
          >
            <StatCard
              icon={<AccessTimeIcon />}
              label="Max Wait Time"
              value={`${stats.max_wait_time} min`}
              color="#DC2626"
              sub="This month"
            />
          </Grid>

          {/* STAFF UTILIZATION */}

          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 3,
            }}
          >
            <StatCard
              icon={<MedicalServicesIcon />}
              label="Staff Utilization"
              value={`${stats.employee_utilization}%`}
              color="#DB2777"
              sub="This month"
            />
          </Grid>

          {/* QUEUE LENGTH */}

          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 3,
            }}
          >
            <StatCard
              icon={<BarChartIcon />}
              label="Queue Length"
              value={stats.queue_length}
              color="#0891B2"
              sub="Live now"
              live
            />
          </Grid>

          {/* PEAK HOUR */}

          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 3,
            }}
          >
            <StatCard
              icon={<AccessTimeIcon />}
              label="Peak Hour"
              value={stats.peak_hour}
              color="#EA580C"
              sub="This month"
            />
          </Grid>
        </Grid>

        {/* =================================================
                    QUEUE STATUS + SERVICE DISTRIBUTION
                ================================================= */}

        <Grid
          container
          spacing={2}
          sx={{
            mb: 2,
          }}
        >
          {/* QUEUE STATUS */}

          <Grid
            size={{
              xs: 12,
              md: 6,
            }}
          >
            <ChartCard title="Queue Status (Live)">
              {queue_status.length === 0 ? (
                <Empty />
              ) : (
                <Stack spacing={1.75}>
                  {queue_status.map((item) => (
                    <Box key={item.label}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        sx={{
                          mb: 0.75,
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 13,

                            fontWeight: 600,

                            color: COLORS.text,
                          }}
                        >
                          {item.label}
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: 13,

                            color: COLORS.muted,
                          }}
                        >
                          {item.value} ({item.pct}
                          %)
                        </Typography>
                      </Stack>

                      <Box
                        sx={{
                          height: 8,

                          borderRadius: 99,

                          backgroundColor: "#E2E8F0",

                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            height: "100%",

                            width: `${item.pct}%`,

                            backgroundColor: item.color,

                            borderRadius: 99,

                            transition: "width 0.5s ease",
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              )}
            </ChartCard>
          </Grid>

          {/* SERVICE DISTRIBUTION */}

          <Grid
            size={{
              xs: 12,
              md: 6,
            }}
          >
            <ChartCard title="Service Distribution (This Month)">
              {service_distribution.length === 0 ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={service_distribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      label={(entry) =>
                        `${(entry as any).name ?? ""} ${Math.round(
                          (entry as any).percent ?? 0,
                        )}%`
                      }
                      labelLine={false}
                    >
                      {service_distribution.map((item, index) => (
                        <Cell key={index} fill={item.color} />
                      ))}
                    </Pie>

                    <Tooltip formatter={(value) => [value ?? 0, "Count"]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </Grid>
        </Grid>

        {/* =================================================
                    QUEUE LENGTH + CUSTOMER FLOW
                ================================================= */}

        <Grid
          container
          spacing={2}
          sx={{
            mb: 2,
          }}
        >
          {/* QUEUE LENGTH */}

          <Grid
            size={{
              xs: 12,
              md: 6,
            }}
          >
            <ChartCard title="Appointment Volume Trend (This Month)">
              {queue_length_trend.length === 0 ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={queue_length_trend}>
                    <XAxis
                      dataKey="time"
                      tick={{
                        fontSize: 11,
                      }}
                    />

                    <YAxis
                      tick={{
                        fontSize: 11,
                      }}
                    />

                    <Tooltip />

                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#2563EB"
                      strokeWidth={2}
                      dot={false}
                      name="Queue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </Grid>

          {/* CUSTOMER FLOW */}

          <Grid
            size={{
              xs: 12,
              md: 6,
            }}
          >
            <ChartCard title="Customer Flow by Time Slot (This Month)">
              {customer_flow.length === 0 ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={customer_flow}>
                    <XAxis
                      dataKey="slot"
                      tick={{
                        fontSize: 11,
                      }}
                    />

                    <YAxis
                      tick={{
                        fontSize: 11,
                      }}
                    />

                    <Tooltip />

                    <Legend
                      iconSize={10}
                      wrapperStyle={{
                        fontSize: 12,
                      }}
                    />

                    <Bar
                      dataKey="booked"
                      fill="#0891B2"
                      name="Booked"
                      radius={[4, 4, 0, 0]}
                    />

                    <Bar
                      dataKey="served"
                      fill="#16A34A"
                      name="Served"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </Grid>
        </Grid>

        {/* =================================================
                    EMPLOYEE UTILIZATION + PEAK HOURS
                ================================================= */}

        <Grid
          container
          spacing={2}
          sx={{
            mb: 2,
          }}
        >
          {/* EMPLOYEE UTILIZATION */}

          <Grid
            size={{
              xs: 12,
              md: 6,
            }}
          >
            <ChartCard title="Employee Utilization (This Month)">
              {employee_utilization.length === 0 ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={employee_utilization} layout="vertical">
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{
                        fontSize: 11,
                      }}
                      unit="%"
                    />

                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{
                        fontSize: 11,
                      }}
                      width={90}
                    />

                    <Tooltip
                      formatter={(value) => [`${value ?? 0}%`, "Utilization"]}
                    />

                    <Bar
                      dataKey="value"
                      fill="#7C3AED"
                      radius={[0, 4, 4, 0]}
                      name="Utilization"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </Grid>

          {/* PEAK HOURS */}

          <Grid
            size={{
              xs: 12,
              md: 6,
            }}
          >
            <ChartCard title="Peak Hours (This Month)">
              {peak_hours.length === 0 ? (
                <Empty />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={peak_hours}>
                    <XAxis
                      dataKey="hour"
                      tick={{
                        fontSize: 11,
                      }}
                    />

                    <YAxis
                      tick={{
                        fontSize: 11,
                      }}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="value"
                      fill="#EA580C"
                      radius={[4, 4, 0, 0]}
                      name="Appointments"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </Grid>
        </Grid>

        {/* =================================================
                    WAIT TIME DISTRIBUTION
                ================================================= */}

        <ChartCard title="Wait Time Distribution (This Month)">
          {wait_distribution.every((item) => item.value === 0) ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={wait_distribution}>
                <XAxis
                  dataKey="range"
                  tick={{
                    fontSize: 12,
                  }}
                />

                <YAxis
                  tick={{
                    fontSize: 12,
                  }}
                />

                <Tooltip />

                <Bar
                  dataKey="value"
                  fill="#2563EB"
                  radius={[4, 4, 0, 0]}
                  name="Patients"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </Box>
    </Fade>
  );
}