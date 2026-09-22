import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  LinearProgress,
  Chip,
  CircularProgress,
  Rating,
  alpha,
} from "@mui/material";
import {
  AccessTime as ClockIcon,
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  Assignment as AssignmentIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
} from "@mui/icons-material";
import { getEmployeePerformance } from "../../services/employeeService";

interface PerformanceData {
  total_customers_served: number;
  customers_served_today: number;
  average_service_duration: number;
  completion_rate: number;
  cancelled_count: number;
  no_show_count: number;
  left_queue_count: number;
  total_assigned_appointments: number;
  completed_appointments: number;
  rating?: number | string | null;
}

const CONTENT_KEYFRAMES = {
  "@keyframes pageFadeUp": {
    from: { opacity: 0, transform: "translateY(16px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
};

/* =========================================================
   COLORS — matches OrgAdminDashboard.tsx palette
========================================================= */
const COLORS = {
  text: "#1F2937",
  muted: "#64748B",
  border: "#D9E2F0",
  borderHover: "#93C5FD",
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

const statusFromScore = (
  score: number,
): { text: string; bg: string; fg: string; accent: string } => {
  if (score >= 90)
    return { text: "Excellent", bg: "#DCFCE7", fg: "#166534", accent: "#16A34A" };
  if (score >= 70)
    return { text: "Good", bg: "#FEF3C7", fg: "#92400E", accent: "#D97706" };
  return { text: "Needs Improvement", bg: "#FEE2E2", fg: "#991B1B", accent: "#DC2626" };
};

const safePct = (numerator: number, denominator: number) =>
  denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

const panelSx = {
  p: 3,
  borderRadius: 3,
  border: `1px solid ${COLORS.border}`,
  boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
};

/* =========================================================
   STAT CARD — same design as OrgAdminDashboard.tsx's StatCard
   so the employee portal matches the org admin portal
========================================================= */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  sub: string;
  live?: boolean;
}

function StatCard({
  icon,
  label,
  value,
  color,
  sub,
  live = false,
}: StatCardProps) {
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
        transition:
          "transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease",
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
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{ width: "100%" }}
        >
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

          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: `${color}1A`,
              color,
              flexShrink: 0,
              fontSize: 18,
              ml: "auto",
            }}
          >
            {icon}
          </Box>
        </Stack>

        <Typography
          sx={{
            mt: 1.4,
            fontSize: 28,
            lineHeight: 1,
            fontWeight: 800,
            color: COLORS.text,
            letterSpacing: "-0.02em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value}
        </Typography>

        <Stack
          direction="row"
          alignItems="center"
          spacing={0.6}
          sx={{ mt: 0.75 }}
        >
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
            sx={{ fontSize: 11, color: COLORS.muted, fontWeight: 500 }}
          >
            {sub}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

/* =========================================================
   SCORE HERO — the page's headline metric, given its own card
   so the 4 secondary KPIs below don't compete with it for
   attention
========================================================= */
interface ScoreHeroProps {
  score: number;
  statusText: string;
  statusBg: string;
  statusFg: string;
  ringColor: string;
}

function ScoreHeroCard({ score, statusText, statusBg, statusFg, ringColor }: ScoreHeroProps) {
  return (
    <Card
      elevation={0}
      sx={{
        position: "relative",
        height: "100%",
        minHeight: 208,
        borderRadius: "22px",
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.1,
        p: 3,
        textAlign: "center",
      }}
    >
      <Box sx={{ position: "relative", display: "inline-flex", mt: 0.5 }}>
        <CircularProgress
          variant="determinate"
          value={100}
          size={112}
          thickness={4}
          sx={{ color: alpha(ringColor, 0.14) }}
        />
        <CircularProgress
          variant="determinate"
          value={Math.max(0, Math.min(100, score))}
          size={112}
          thickness={4}
          sx={{ color: ringColor, position: "absolute", left: 0, strokeLinecap: "round" }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ fontSize: 27, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>
            {score}
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: COLORS.muted, fontWeight: 600 }}>/ 100</Typography>
        </Box>
      </Box>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.text }}>
        Performance Score
      </Typography>
      <Chip
        label={statusText}
        size="small"
        sx={{ fontWeight: 700, bgcolor: statusBg, color: statusFg }}
      />
      <Typography sx={{ fontSize: 11, color: COLORS.muted }}>
        Based on all-time completion rate
      </Typography>
    </Card>
  );
}

export default function MyPerformance() {
  const employeeId = localStorage.getItem("employee_id");
  const employeeName = localStorage.getItem("name") || "Employee";

  const [perf, setPerf] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      load();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      load({ silent: true });
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const ticker = setInterval(() => setRefreshTick((t) => t + 1), 15000);
    return () => clearInterval(ticker);
  }, []);

  const load = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    try {
      const perfRes = await getEmployeePerformance(employeeId!);
      setPerf(perfRes.data.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to load employee performance data:", error);
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "60vh",
        }}
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!perf) {
    return (
      <Box sx={{ px: { xs: 2, md: 4 }, py: 6, textAlign: "center" }}>
        <Typography color="text.secondary">
          Could not load performance data.
        </Typography>
      </Box>
    );
  }

  const score = Math.round(perf.completion_rate);
  const status = statusFromScore(score);

  const avgServiceDuration = perf.average_service_duration || 0;
  const goals = [
    {
      label: "Completion Rate (all-time)",
      pct: Math.round(perf.completion_rate),
    },
    {
      label: "Cancellation-Free Rate",
      pct:
        100 - safePct(perf.cancelled_count, perf.total_assigned_appointments),
    },
    {
      label: "No-Show-Free Rate",
      pct: 100 - safePct(perf.no_show_count, perf.total_assigned_appointments),
    },
  ];

  const achievements: string[] = [];
  if (perf.completion_rate === 100 && perf.total_assigned_appointments > 0) {
    achievements.push("100% completion rate this period");
  }
  if (perf.customers_served_today > 0) {
    achievements.push(
      `${perf.customers_served_today} customer${perf.customers_served_today === 1 ? "" : "s"} completed today`,
    );
  }
  if (
    perf.cancelled_count === 0 &&
    perf.no_show_count === 0 &&
    perf.total_assigned_appointments > 0
  ) {
    achievements.push("Zero cancellations or no-shows");
  }

  const numericRating =
    perf.rating === null || perf.rating === undefined || perf.rating === ""
      ? null
      : Number(perf.rating);

  // Today's activity (customers served today, wait/handling time) already
  // lives on the employee Dashboard — this page only shows all-time
  // performance metrics, so nothing here duplicates that page.
  const widgets: StatCardProps[] = [
    {
      icon: <AssignmentTurnedInIcon />,
      label: "Completed Appointments",
      value: perf.total_customers_served,
      sub: "All-time total",
      color: "#0891B2",
    },
    {
      icon: <StarIcon />,
      label: "Customer Rating",
      value:
        numericRating !== null
          ? `${numericRating.toFixed(2)} / 5`
          : "No ratings yet",
      sub: "Average across all reviews",
      color: "#F59E0B",
    },
    {
      icon: <ClockIcon />,
      label: "Avg Service Duration",
      value: `${avgServiceDuration}m`,
      sub: "All-time average per appointment",
      color: "#7C3AED",
    },
    {
      icon: <AssignmentIcon />,
      label: "Total Assigned",
      value: perf.total_assigned_appointments,
      sub: "All-time assigned appointments",
      color: "#DB2777",
    },
  ];

  return (
    <Box
      sx={{
        px: { xs: 2, md: 4 },
        py: 3.5,
        ...CONTENT_KEYFRAMES,
        animation: "pageFadeUp 0.45s cubic-bezier(0.22,1,0.36,1) forwards",
      }}
    >
      <Stack spacing={3}>
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.25 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {employeeName}'s Performance
            </Typography>
            <Stack direction="row" spacing={0.6} sx={{ alignItems: "center", pl: 0.5 }}>
              <LiveDot />
              <Typography variant="caption" sx={{ color: "success.dark", fontWeight: 700, letterSpacing: 0.3 }}>
                LIVE
              </Typography>
            </Stack>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            All-time performance and quality metrics.
            {updatedLabel ? ` · ${updatedLabel}` : ""}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "260px 1fr" },
            gap: 2,
            alignItems: "stretch",
          }}
        >
          <ScoreHeroCard
            score={score}
            statusText={status.text}
            statusBg={status.bg}
            statusFg={status.fg}
            ringColor={status.accent}
          />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            {widgets.map((w) => (
              <StatCard key={w.label} {...w} />
            ))}
          </Box>
        </Box>

        {/* Detail panels */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2.5,
            alignItems: "stretch",
          }}
        >
          <Card
            elevation={0}
            sx={{
              ...panelSx,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700 }}
              gutterBottom
            >
              Performance Summary
            </Typography>
            <Stack spacing={1.5} sx={{ mt: 1 }}>
              <Stack
                direction="row"
                sx={{ justifyContent: "space-between", alignItems: "center" }}
              >
                <Typography variant="body2" color="text.secondary">
                  Customer Rating
                </Typography>
                {numericRating !== null ? (
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Rating
                      value={numericRating}
                      precision={0.1}
                      readOnly
                      size="small"
                      emptyIcon={
                        <StarIcon
                          style={{ opacity: 0.15 }}
                          fontSize="inherit"
                        />
                      }
                    />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {numericRating.toFixed(2)}
                    </Typography>
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No ratings yet
                  </Typography>
                )}
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Completion Rate (all-time)
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {perf.completion_rate}%
                </Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Cancelled (all-time)
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {perf.cancelled_count}
                </Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  No Show (all-time)
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {perf.no_show_count}
                </Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Left Queue (all-time)
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {perf.left_queue_count}
                </Typography>
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="body2" color="text.secondary">
                  Last Updated
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {lastUpdated
                    ? lastUpdated.toLocaleString([], {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : "-"}
                </Typography>
              </Stack>
            </Stack>
          </Card>

          <Card
            elevation={0}
            sx={{
              ...panelSx,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700 }}
              gutterBottom
            >
              Goal Progress
            </Typography>
            <Stack spacing={2.5} sx={{ mt: 1.5 }}>
              {goals.map((goal) => (
                <Box key={goal.label}>
                  <Stack
                    direction="row"
                    sx={{ justifyContent: "space-between", mb: 0.75 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {goal.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {goal.pct}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.max(0, Math.min(100, goal.pct))}
                    sx={{
                      height: 8,
                      borderRadius: 999,
                      bgcolor: "background.default",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 999,
                        backgroundColor: "#2563EB",
                      },
                    }}
                  />
                </Box>
              ))}
            </Stack>
          </Card>

          <Card
            elevation={0}
            sx={{
              ...panelSx,
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700 }}
              gutterBottom
            >
              Recent Achievements
            </Typography>
            {achievements.length === 0 ? (
              <Box
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  py: 2,
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "#F59E0B1A",
                    color: "#F59E0B",
                  }}
                >
                  <TrophyIcon fontSize="small" />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  No achievements yet — complete a few appointments to unlock
                  some.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={1.25} sx={{ mt: 1.5 }}>
                {achievements.map((text) => (
                  <Stack
                    key={text}
                    direction="row"
                    spacing={1.25}
                    alignItems="center"
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "background.default",
                    }}
                  >
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "#F59E0B1A",
                        color: "#F59E0B",
                        flexShrink: 0,
                      }}
                    >
                      <TrophyIcon fontSize="small" />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {text}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            )}
          </Card>
        </Box>
      </Stack>
    </Box>
  );
}