import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Box, Card, Typography, Stack, Select, MenuItem } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import {
  Business as BuildingIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as ClockIcon,
  CurrencyRupee as RupeeIcon,
  Cancel as RejectedIcon,
} from "@mui/icons-material";
import {
  ResponsiveContainer,
  LineChart,
  Line as RechartsLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip as ChartJsTooltip,
  Legend as ChartJsLegend,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
import { getDashboard, getOrganizations } from "../../../services/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  ChartJsTooltip,
  ChartJsLegend,
);

// ---- Shapes returned by GET /dashboard/ ----
interface DashboardCardsData {
  total_organizations: number;
  active_organizations: number;
  pending_requests: number;
  monthly_revenue: number;
}
interface GrowthPoint {
  month: string;
  organizations: number;
}
interface MrrPoint {
  week: string;
  mrr: number;
  tenants: number;
}
interface CategoryRow {
  category: string;
  count: number;
}
interface PlanRow {
  plan: string;
  count: number;
}
interface ChangeRow {
  month: string;
  new_signups: number;
  upgrades: number;
  downgrades: number;
}
interface DashboardData {
  cards?: DashboardCardsData;
  organization_growth?: GrowthPoint[];
  mrr_growth?: MrrPoint[];
  category_mix?: CategoryRow[];
  plan_distribution?: PlanRow[];
  subscription_changes?: ChangeRow[];
}

const CATEGORY_COLORS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#06B6D4",
];
const PLAN_COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B"];
const CHART_HEIGHT = 220;
const ALL_CATEGORIES = [
  "Hospitals",
  "Banks",
  "Clinics",
  "Retail",
  "Customer Support",
];

const SuperAdminDashboard = () => {
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [mrrPeriod, setMrrPeriod] = useState("Monthly");
  const navigate = useNavigate();
  const [rejectedCount, setRejectedCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    getOrganizations({ page: 1, page_size: 1, status: "rejected" })
      .then((res) => {
        if (isMounted) setRejectedCount(res?.pagination?.total_records ?? 0);
      })
      .catch((err) =>
        console.error("Failed to load rejected organizations count:", err),
      );
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    getDashboard()
      .then((res) => {
        if (isMounted) setData(res?.data ?? {});
      })
      .catch((err) => console.error("Failed to load dashboard data:", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const summary: DashboardCardsData = data.cards ?? {
    total_organizations: 0,
    active_organizations: 0,
    pending_requests: 0,
    monthly_revenue: 0,
  };

  const growthData: GrowthPoint[] = data.organization_growth ?? [];
  const mrrPoints: MrrPoint[] = data.mrr_growth ?? [];
  const categoryRows: CategoryRow[] = data.category_mix ?? [];
  const planRows: PlanRow[] = data.plan_distribution ?? [];
  const changeRows: ChangeRow[] = data.subscription_changes ?? [];

  const cards = [
    {
      title: "Total Organizations",
      value: summary.total_organizations,
      icon: <BuildingIcon fontSize="small" />,
      iconColor: "#0E7490",
      subtitle: "Across all categories",
      onClick: () => navigate("/super-admin/organizations"),
    },
    {
      title: "Active Organizations",
      value: summary.active_organizations,
      icon: <CheckCircleIcon fontSize="small" />,
      iconColor: "#059669",
      subtitle: "100% of total",
      onClick: () => navigate("/super-admin/organizations?status=active"),
    },
    {
      title: "Pending Requests",
      value: summary.pending_requests,
      icon: <ClockIcon fontSize="small" />,
      iconColor: "#D97706",
      subtitle: "Awaiting review",
      onClick: () => navigate("/super-admin/organizations?status=pending"),
    },
    {
      title: "Rejected Organizations",
      value: rejectedCount,
      icon: <RejectedIcon fontSize="small" />,
      iconColor: "#B91C1C",
      subtitle: "Declined requests",
      onClick: () => navigate("/super-admin/organizations?status=rejected"),
    },
    {
      title: "Monthly Revenue",
      value: `₹ ${Number(summary.monthly_revenue || 0).toLocaleString()}`,
      icon: <RupeeIcon fontSize="small" />,
      iconColor: "#6D28D9",
      subtitle: "+8% MoM",
      onClick: () => navigate("/super-admin/subscriptions"),
    },
  ];

  const mrrChartData = {
    labels: mrrPoints.map((p) => p.week),
    datasets: [
      {
        label: "Revenue",
        data: mrrPoints.map((p) => p.mrr),
        borderColor: "#10b981",
        backgroundColor: "#10b981",
        tension: 0.4,
        fill: false,
      },
    ],
  };
  const mrrOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  const mergedCategoryRows: CategoryRow[] = ALL_CATEGORIES.map((category) => {
    const match = categoryRows.find(
      (r) => r.category.trim().toLowerCase() === category.trim().toLowerCase(),
    );
    return { category, count: match ? match.count : 0 };
  });
  categoryRows.forEach((r) => {
    const alreadyIncluded = mergedCategoryRows.some(
      (m) =>
        m.category.trim().toLowerCase() === r.category.trim().toLowerCase(),
    );
    if (!alreadyIncluded) mergedCategoryRows.push(r);
  });
  const categoryChartData = {
    labels: mergedCategoryRows.map((r) => r.category),
    datasets: [
      {
        data: mergedCategoryRows.map((r) => r.count),
        backgroundColor: mergedCategoryRows.map(
          (_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length],
        ),
        borderWidth: 0,
      },
    ],
  };
  const categoryOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" as const } },
    cutout: "70%",
  };

  // ---- Plan Distribution (Chart.js horizontal bar) ----
  const planChartData = {
    labels: planRows.map((r) => r.plan),
    datasets: [
      {
        label: "Organizations",
        data: planRows.map((r) => r.count),
        backgroundColor: planRows.map(
          (_, i) => PLAN_COLORS[i % PLAN_COLORS.length],
        ),
        borderRadius: 8,
      },
    ],
  };
  const planOptions = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  // ---- Subscription Changes (Chart.js grouped bar) ----
  const changesChartData = {
    labels: changeRows.map((r) => r.month),
    datasets: [
      {
        label: "New signups",
        data: changeRows.map((r) => r.new_signups),
        backgroundColor: "#3B82F6",
        borderRadius: 8,
      },
      {
        label: "Upgraded plan",
        data: changeRows.map((r) => r.upgrades),
        backgroundColor: "#10B981",
        borderRadius: 8,
      },
      {
        label: "Downgraded plan",
        data: changeRows.map((r) => r.downgrades),
        backgroundColor: "#F59E0B",
        borderRadius: 8,
      },
    ],
  };
  const changesOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "top" as const } },
  };

  const ChartCard = ({
    title,
    subtitle,
    action,
    height = CHART_HEIGHT,
    children,
  }: {
    title: string;
    subtitle?: string;
    action?: ReactNode;
    height?: number;
    children: ReactNode;
  }) => (
    <Card
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1.75,
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Box>
      <Box
        sx={{
          position: "relative",
          flex: 1,
          width: "100%",
          height,
          minHeight: height,
        }}
      >
        {children}
      </Box>
    </Card>
  );

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
            Platform Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Health of the multi-tenant platform across organizations.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "repeat(3, 1fr)",
              lg: "repeat(5, 1fr)",
            },
            gap: 2.25,
          }}
        >
          {cards.map((card, index) => (
            <Card
              key={index}
              elevation={0}
              onClick={card.onClick}
              sx={{
                position: "relative",
                overflow: "hidden",
                p: 2.5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
                color: "text.primary",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                cursor: "pointer",
                transition: "transform .18s ease, box-shadow .18s ease",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: "0 8px 18px rgba(0,0,0,0.10)",
                },
              }}
            >
              <Box
                sx={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="overline"
                    sx={{
                      letterSpacing: "0.06em",
                      fontWeight: 600,
                      lineHeight: 1.4,
                      color: "text.secondary",
                    }}
                  >
                    {card.title}
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      mt: 0.5,
                      fontFamily: "'Sora', sans-serif",
                      color: "text.primary",
                    }}
                  >
                    {loading ? "—" : card.value}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 500,
                      display: "block",
                      mt: 0.75,
                      color: "text.secondary",
                    }}
                  >
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
                    bgcolor: `${card.iconColor}1A`,
                    border: `1px solid ${card.iconColor}33`,
                    color: card.iconColor,
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </Box>
              </Box>
            </Card>
          ))}
        </Box>

        <ChartCard
          title="Organization Growth"
          subtitle="New organizations onboarded, last 12 months"
        >
          {growthData.length === 0 ? (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.secondary",
              }}
            >
              <Typography variant="body2">
                {loading
                  ? "Loading chart..."
                  : "No organization growth data yet"}
              </Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <LineChart
                data={growthData}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis
                  allowDecimals={false}
                  domain={[0, (max: number) => Math.max(max + 1, 4)]}
                />
                <RechartsTooltip />
                <RechartsLine
                  type="monotone"
                  dataKey="organizations"
                  stroke="#06b6d4"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#06b6d4" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="MRR & Tenant Growth"
          action={
            <Select
              size="small"
              value={mrrPeriod}
              onChange={(e: SelectChangeEvent) => setMrrPeriod(e.target.value)}
              sx={{ minWidth: 110 }}
            >
              <MenuItem value="Monthly">Monthly</MenuItem>
              <MenuItem value="Yearly">Yearly</MenuItem>
            </Select>
          }
        >
          <Line data={mrrChartData} options={mrrOptions} />
        </ChartCard>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2.5,
          }}
        >
          <ChartCard title="Category Mix">
            <Doughnut data={categoryChartData} options={categoryOptions} />
          </ChartCard>

          <ChartCard title="Plan Distribution">
            <Bar data={planChartData} options={planOptions} />
          </ChartCard>
        </Box>
        <ChartCard title="Subscription Changes">
          <Bar data={changesChartData} options={changesOptions} />
        </ChartCard>
      </Stack>
    </Box>
  );
};

export default SuperAdminDashboard;