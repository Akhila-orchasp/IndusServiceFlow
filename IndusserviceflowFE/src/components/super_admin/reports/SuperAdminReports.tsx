import { useEffect, useMemo, useState } from "react";

import type { MouseEvent, ReactNode } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Fade,
  Grid,
  Grow,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";

import DownloadIcon from "@mui/icons-material/Download";
import BusinessIcon from "@mui/icons-material/Business";
import GroupsIcon from "@mui/icons-material/Groups";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import PieChartIcon from "@mui/icons-material/PieChart";
import ExportMenu from "../../common/ExportMenu";
import type { ExportFormat } from "../../common/ExportMenu";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";

import {
  getSuperAdminReport,
  exportSuperAdminReport,
} from "../../../services/api";

/* =========================================================
   TYPES
========================================================= */

interface BreakdownItem {
  status?: string;
  count: number;
  category?: string;
  plan?: string;
  role?: string;
}

interface RecentUser {
  username: string;
  email: string;
  role: string;
  status: string;
  created_on: string;
}

interface RecentAuditLog {
  action_name: string;
  action_screen: string;
  username: string;
  role: string;
  target_info: string;
  audit_date: string;
}

interface SuperAdminReportData {
  cards: {
    total_organizations: number;
    active_organizations: number;
    pending_requests: number;
    monthly_revenue: number;
    organizations_with_subscription: number;
  };

  organization_growth: {
    month: string;
    organizations: number;
  }[];

  mrr_growth: {
    week: string;
    mrr: number;
    tenants: number;
  }[];

  category_mix: {
    category: string;
    count: number;
  }[];

  plan_distribution: {
    plan: string;
    count: number;
  }[];

  subscription_changes: {
    month: string;
    new_signups: number;
    upgrades: number;
    downgrades: number;
  }[];

  organization_status_breakdown: BreakdownItem[];
  subscription_status_breakdown: BreakdownItem[];
  user_role_breakdown: BreakdownItem[];
  user_status_breakdown: BreakdownItem[];

  recent_users: RecentUser[];
  recent_audit_logs: RecentAuditLog[];
}

type ExportStatus = {
  type: "loading" | "success" | "error";
  msg: string;
} | null;

interface ReportDateRange {
  start_date: string;
  end_date: string;
}

const ROWS_PER_PAGE = 10;

/* =========================================================
   DATE HELPERS
========================================================= */

const toISODate = (date: Date) => date.toISOString().slice(0, 10);

const getDefaultDateRange = (): ReportDateRange => {
  const end = new Date();
  const start = new Date();

  start.setDate(start.getDate() - 30);

  return {
    start_date: toISODate(start),
    end_date: toISODate(end),
  };
};

/* =========================================================
   COMPONENT
========================================================= */

const SuperAdminReports = () => {
  const theme = useTheme();

  const [report, setReport] = useState<SuperAdminReportData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [exportStatus, setExportStatus] = useState<ExportStatus>(null);

  const [exportMenuAnchor, setExportMenuAnchor] = useState<null | HTMLElement>(
    null,
  );

  /* =====================================================
       DATE RANGE STATE
    ===================================================== */

  const [draftRange, setDraftRange] = useState<ReportDateRange>(
    getDefaultDateRange(),
  );

  const [appliedRange, setAppliedRange] = useState<ReportDateRange>(
    getDefaultDateRange(),
  );

  const dateRangeIsValid =
    Boolean(draftRange.start_date) &&
    Boolean(draftRange.end_date) &&
    draftRange.start_date <= draftRange.end_date;

  const handleApplyDateRange = () => {
    if (!dateRangeIsValid) return;

    setAppliedRange(draftRange);
  };

  /* =====================================================
       THEME COLORS
    ===================================================== */

  const COLORS = useMemo(
    () => ({
      primary: theme.palette.primary.main,
      primaryDark: theme.palette.primary.dark,

      sectionHeader: alpha(theme.palette.primary.main, 0.08),

      sectionHeaderHover: alpha(theme.palette.primary.main, 0.14),

      tableHeader: alpha(theme.palette.primary.main, 0.08),

      tableHeaderHover: alpha(theme.palette.primary.main, 0.14),

      tableRow: theme.palette.background.paper,

      tableRowHover: alpha(theme.palette.primary.main, 0.12),

      border: theme.palette.divider,

      borderHover: theme.palette.primary.light,

      text: theme.palette.text.primary,

      mutedText: theme.palette.text.secondary,

      cardBackground: theme.palette.background.paper,
    }),
    [theme],
  );

  const chartColors = [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.secondary.main,
    theme.palette.info.main,
  ];

  const chartCardSx = {
    width: "100%",
    height: 360,
    p: 2.5,
    backgroundColor: "#FFFFFF",
  };

  /* =====================================================
       EXPORT MENU
    ===================================================== */

  const handleExportMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setExportMenuAnchor(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportMenuAnchor(null);
  };

  /* =====================================================
       LOAD REPORT
    ===================================================== */

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);

        const reportData = await getSuperAdminReport(appliedRange);

        setReport(reportData);
      } catch (err) {
        console.error("Failed to load super admin report:", err);

        setError("Unable to load report data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [appliedRange]);

  /* =====================================================
       DOWNLOAD BLOB
    ===================================================== */

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    window.URL.revokeObjectURL(url);
  };

  /* =====================================================
       EXPORT REPORT
    ===================================================== */

  const exportReport = async (format: "csv" | "excel" | "pdf") => {
    const label = format === "excel" ? "Excel" : format.toUpperCase();

    setExportStatus({
      type: "loading",
      msg: `Preparing ${label} download...`,
    });

    try {
      const blobData = await exportSuperAdminReport(format, appliedRange);

      const filename = `superadmin_report_${appliedRange.start_date}_to_${appliedRange.end_date}.${format === "excel" ? "xlsx" : format}`;

      downloadBlob(blobData, filename);

      setExportStatus({
        type: "success",
        msg: `${label} downloaded successfully!`,
      });
    } catch (err) {
      console.error("Super admin report export failed:", err);

      setExportStatus({
        type: "error",
        msg: `Failed to download ${label}. Please try again.`,
      });
    } finally {
      setTimeout(() => {
        setExportStatus(null);
      }, 3500);
    }
  };

  /* =====================================================
       SUMMARY CARDS
    ===================================================== */

  const summaryCards = report
    ? [
        {
          title: "Total Organizations",
          subtitle: "Across all categories",
          value: report.cards.total_organizations,
          icon: <BusinessIcon />,
          iconColor: theme.palette.primary.main,
        },

        {
          title: "Active Organizations",
          subtitle: "Currently active",
          value: report.cards.active_organizations,
          icon: <GroupsIcon />,
          iconColor: theme.palette.success.main,
        },

        {
          title: "Pending Requests",
          subtitle: "Awaiting review",
          value: report.cards.pending_requests,
          icon: <ScheduleIcon />,
          iconColor: theme.palette.warning.main,
        },

        {
          title: "Monthly Revenue",
          subtitle: "This month",
          value: `₹${Number(report.cards.monthly_revenue).toLocaleString(
            "en-IN",
          )}`,
          icon: <CreditCardIcon />,
          iconColor: theme.palette.secondary.main,
        },

        {
          title: "With Subscriptions",
          subtitle: "Have an active plan",
          value: report.cards.organizations_with_subscription,
          icon: <PieChartIcon />,
          iconColor: theme.palette.info.main,
        },
      ]
    : [];

  /* =====================================================
       REPORT SECTION
    ===================================================== */

  const ReportSection = ({
    title,
    children,
  }: {
    title: string;
    children: ReactNode;
  }) => {
    return (
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          mb: 3,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 2,
          overflow: "hidden",
          backgroundColor: COLORS.cardBackground,
          transition: "all 0.3s ease",

          "&:hover": {
            borderColor: COLORS.borderHover,

            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.12)}`,
          },
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2,
            backgroundColor: COLORS.sectionHeader,
            borderBottom: `1px solid ${COLORS.border}`,

            transition: "all 0.25s ease",

            "&:hover": {
              backgroundColor: COLORS.sectionHeaderHover,
            },
          }}
        >
          <Typography
            sx={{
              fontSize: 18,
              fontWeight: 700,
              color: COLORS.text,

              "&:hover": {
                color: COLORS.primaryDark,
              },
            }}
          >
            {title}
          </Typography>
        </Box>

        {children}
      </Paper>
    );
  };

  /* =====================================================
       PAGINATION FOOTER
    ===================================================== */

  const PaginationFooter = ({
    count,
    page,
    onPageChange,
  }: {
    count: number;
    page: number;
    onPageChange: (newPage: number) => void;
  }) => {
    if (count <= ROWS_PER_PAGE) return null;

    return (
      <TablePagination
        component="div"
        count={count}
        page={page}
        onPageChange={(_, newPage) => onPageChange(newPage)}
        rowsPerPage={ROWS_PER_PAGE}
        rowsPerPageOptions={[ROWS_PER_PAGE]}
        sx={{
          borderTop: `1px solid ${COLORS.border}`,

          backgroundColor: "#F8FAFC",

          ".MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows":
            {
              fontSize: 13,
              color: COLORS.mutedText,
            },

          ".MuiTablePagination-actions button": {
            color: COLORS.primary,
          },
        }}
      />
    );
  };

  /* =====================================================
       BREAKDOWN ANALYTICS
    ===================================================== */

  const BreakdownSection = ({
    title,
    items,
    labelKey,
  }: {
    title: string;
    items: BreakdownItem[];
    labelKey: "status" | "role" | "category" | "plan";
  }) => {
    const isUserRole = labelKey === "role";

    const isOrganizationStatus = title === "Organization Status Breakdown";

    if (isUserRole) {
      return (
        <ReportSection title={title}>
          <Box sx={chartCardSx}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={items}
                  dataKey="count"
                  nameKey={labelKey}
                  cx="50%"
                  cy="45%"
                  outerRadius={105}
                  innerRadius={55}
                  paddingAngle={3}
                >
                  {items.map((_, index) => (
                    <Cell
                      key={`${title}-${index}`}
                      fill={chartColors[index % chartColors.length]}
                    />
                  ))}
                </Pie>

                <RechartsTooltip />

                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </ReportSection>
      );
    }

    if (isOrganizationStatus) {
      return (
        <ReportSection title={title}>
          <Box sx={chartCardSx}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="48%" outerRadius="72%" data={items}>
                <PolarGrid />

                <PolarAngleAxis dataKey={labelKey} />

                <PolarRadiusAxis />

                <Radar
                  name="Organizations"
                  dataKey="count"
                  stroke={chartColors[0]}
                  fill={chartColors[0]}
                  fillOpacity={0.45}
                />

                <RechartsTooltip />

                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </Box>
        </ReportSection>
      );
    }

    return (
      <ReportSection title={title}>
        <Box sx={chartCardSx}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={items}
              margin={{
                top: 15,
                right: 20,
                left: 0,
                bottom: 15,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey={labelKey} />

              <YAxis />

              <RechartsTooltip />

              <Bar dataKey="count" name="Count" radius={[8, 8, 0, 0]}>
                {items.map((_, index) => (
                  <Cell
                    key={`${title}-bar-${index}`}
                    fill={chartColors[index % chartColors.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </ReportSection>
    );
  };

  /* =====================================================
       TABLE COMPONENT
    ===================================================== */

  const DataTable = ({
    headers,
    children,
  }: {
    headers: string[];
    children: ReactNode;
  }) => {
    return (
      <TableContainer
        sx={{
          width: "100%",
          overflowX: "auto",
          backgroundColor: "#FFFFFF",
        }}
      >
        <Table
          sx={{
            minWidth: 700,
            borderCollapse: "separate",
            borderSpacing: 0,
          }}
        >
          <TableHead>
            <TableRow>
              {headers.map((header) => (
                <TableCell
                  key={header}
                  sx={{
                    backgroundColor: COLORS.tableHeader,

                    color: COLORS.text,

                    fontSize: 14,

                    fontWeight: 700,

                    whiteSpace: "nowrap",

                    borderBottom: `2px solid ${COLORS.borderHover}`,

                    "&:hover": {
                      backgroundColor: COLORS.tableHeaderHover,

                      color: COLORS.primaryDark,
                    },
                  }}
                >
                  {header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>{children}</TableBody>
        </Table>
      </TableContainer>
    );
  };

  /* =====================================================
       TABLE BODY CELL
    ===================================================== */

  const BodyCell = ({ children }: { children: ReactNode }) => {
    return (
      <TableCell
        sx={{
          color: "#374151",
          fontSize: 14,
          fontWeight: 400,
          whiteSpace: "nowrap",
          backgroundColor: COLORS.tableRow,
          borderBottom: "1px solid #E5E7EB",
          transition: "all 0.2s ease",
        }}
      >
        {children}
      </TableCell>
    );
  };

  /* =====================================================
       TABLE ROW STYLE
    ===================================================== */

  const tableRowSx = {
    cursor: "pointer",
    transition: "all 0.2s ease",

    "&:hover": {
      backgroundColor: COLORS.tableRowHover,

      transform: "scale(1.002)",

      boxShadow: `inset 4px 0 0 ${COLORS.primary}`,

      "& td": {
        backgroundColor: COLORS.tableRowHover,

        color: COLORS.primaryDark,

        fontWeight: 500,
      },
    },
  };

  /* =====================================================
       GENERIC PAGINATED TABLE SECTION
    ===================================================== */

  function PaginatedTableSection<T>({
    title,
    headers,
    rows,
    rowKey,
    renderRow,
  }: {
    title: string;
    headers: string[];
    rows: T[];
    rowKey: (row: T, index: number) => string;
    renderRow: (row: T, index: number) => ReactNode[];
  }) {
    const [page, setPage] = useState(0);

    const start = page * ROWS_PER_PAGE;

    const pageRows = rows.slice(start, start + ROWS_PER_PAGE);

    return (
      <ReportSection title={title}>
        <DataTable headers={headers}>
          {pageRows.map((row, idx) => (
            <TableRow key={rowKey(row, start + idx)} sx={tableRowSx}>
              {renderRow(row, start + idx).map((cell, cellIdx) => (
                <BodyCell key={cellIdx}>{cell}</BodyCell>
              ))}
            </TableRow>
          ))}
        </DataTable>

        <PaginationFooter
          count={rows.length}
          page={page}
          onPageChange={setPage}
        />
      </ReportSection>
    );
  }

  /* =====================================================
       ORGANIZATION GROWTH
    ===================================================== */

  const OrganizationGrowthChart = () => (
    <ReportSection title="Organization Growth">
      <Box sx={chartCardSx}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={report?.organization_growth ?? []}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="month" />

            <YAxis />

            <RechartsTooltip />

            <Area
              type="monotone"
              dataKey="organizations"
              name="Organizations"
              stroke={chartColors[0]}
              fill={chartColors[0]}
              fillOpacity={0.28}
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </ReportSection>
  );

  /* =====================================================
       MRR GROWTH
    ===================================================== */

  const MRRGrowthChart = () => (
    <ReportSection title="MRR Growth">
      <Box sx={chartCardSx}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={report?.mrr_growth ?? []}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="week" />

            <YAxis />

            <RechartsTooltip />

            <Legend />

            <Line
              type="monotone"
              dataKey="mrr"
              name="MRR"
              stroke={chartColors[1]}
              strokeWidth={3}
              dot={{ r: 4 }}
            />

            <Line
              type="monotone"
              dataKey="tenants"
              name="Tenants"
              stroke={chartColors[2]}
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </ReportSection>
  );

  /* =====================================================
       CATEGORY MIX
    ===================================================== */

  const CategoryMixChart = () => (
    <ReportSection title="Category Mix">
      <Box sx={chartCardSx}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={report?.category_mix ?? []}
              dataKey="count"
              nameKey="category"
              cx="50%"
              cy="45%"
              outerRadius={108}
              innerRadius={52}
              paddingAngle={3}
            >
              {(report?.category_mix ?? []).map((_, index) => (
                <Cell
                  key={`category-${index}`}
                  fill={chartColors[index % chartColors.length]}
                />
              ))}
            </Pie>

            <RechartsTooltip />

            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </ReportSection>
  );

  /* =====================================================
       PLAN DISTRIBUTION
    ===================================================== */

  const PlanDistributionChart = () => (
    <ReportSection title="Plan Distribution">
      <Box sx={chartCardSx}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={report?.plan_distribution ?? []}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="plan" />

            <YAxis />

            <RechartsTooltip />

            <Bar dataKey="count" name="Organizations" radius={[8, 8, 0, 0]}>
              {(report?.plan_distribution ?? []).map((_, index) => (
                <Cell
                  key={`plan-${index}`}
                  fill={chartColors[index % chartColors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </ReportSection>
  );

  /* =====================================================
       SUBSCRIPTION CHANGES
    ===================================================== */

  const SubscriptionChangesChart = () => (
    <ReportSection title="Subscription Changes">
      <Box sx={chartCardSx}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={report?.subscription_changes ?? []}>
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis dataKey="month" />

            <YAxis />

            <RechartsTooltip />

            <Legend />

            <Bar
              dataKey="new_signups"
              name="New Signups"
              fill={chartColors[0]}
              radius={[6, 6, 0, 0]}
            />

            <Bar
              dataKey="upgrades"
              name="Upgrades"
              fill={chartColors[1]}
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </ReportSection>
  );

  /* =====================================================
       SUBSCRIPTION STATUS
    ===================================================== */

  const SubscriptionStatusDonutChart = () => (
    <ReportSection title="Subscription Status">
      <Box sx={chartCardSx}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={report?.subscription_status_breakdown ?? []}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="45%"
              outerRadius={105}
              innerRadius={62}
              paddingAngle={3}
            >
              {(report?.subscription_status_breakdown ?? []).map((_, index) => (
                <Cell
                  key={`subscription-status-${index}`}
                  fill={chartColors[index % chartColors.length]}
                />
              ))}
            </Pie>

            <RechartsTooltip />

            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </ReportSection>
  );

  /* =====================================================
       USER STATUS
    ===================================================== */

  const UserStatusDonutChart = () => (
    <ReportSection title="User Status">
      <Box sx={chartCardSx}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={report?.user_status_breakdown ?? []}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="45%"
              outerRadius={105}
              innerRadius={62}
              paddingAngle={3}
            >
              {(report?.user_status_breakdown ?? []).map((_, index) => (
                <Cell
                  key={`user-status-${index}`}
                  fill={chartColors[(index + 2) % chartColors.length]}
                />
              ))}
            </Pie>

            <RechartsTooltip />

            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Box>
    </ReportSection>
  );

  /* =====================================================
       LOADING STATE
    ===================================================== */

  if (loading) {
    return (
      <Fade in={loading} timeout={400}>
        <Box
          sx={{
            width: "100%",
            minHeight: 320,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 4,
          }}
        >
          <Stack alignItems="center" spacing={2}>
            <CircularProgress
              size={44}
              thickness={4}
              sx={{
                color: theme.palette.primary.main,
              }}
            />

            <Typography
              sx={{
                color: theme.palette.text.secondary,
                fontSize: 14,
              }}
            >
              Loading report...
            </Typography>
          </Stack>
        </Box>
      </Fade>
    );
  }

  /* =====================================================
       ERROR STATE
    ===================================================== */

  if (error && !report) {
    return (
      <Fade in={!loading} timeout={400}>
        <Box sx={{ p: 3 }}>
          <Alert
            severity="error"
            variant="outlined"
            sx={{
              borderRadius: 2,
            }}
          >
            {error}
          </Alert>
        </Box>
      </Fade>
    );
  }

  /* =====================================================
       MAIN UI
    ===================================================== */

  return (
    <Fade in={!loading} timeout={500}>
      <Box
        sx={{
          width: "100%",
          boxSizing: "border-box",
          p: {
            xs: 2,
            sm: 3,
          },
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
          spacing={2}
          sx={{
            width: "100%",
            mb: 3,
            justifyContent: "space-between",
            alignItems: {
              xs: "flex-start",
              md: "center",
            },
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: {
                  xs: 28,
                  sm: 32,
                },
                lineHeight: 1.2,
                fontWeight: 700,
                color: theme.palette.text.primary,
              }}
            >
              Reports
            </Typography>

            <Typography
              sx={{
                mt: 0.75,
                color: theme.palette.text.secondary,
                fontSize: 14,
              }}
            >
              Platform-level analytics and export for Super Admin.
            </Typography>
          </Box>

          {/* DATE RANGE + EXPORT */}

          <Stack
            direction={{
              xs: "column",
              sm: "row",
            }}
            spacing={1.5}
            alignItems={{
              xs: "stretch",
              sm: "center",
            }}
          >
            <TextField
              type="date"
              size="small"
              label="From"
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
              }}
              value={draftRange.start_date}
              onChange={(e) =>
                setDraftRange((prev) => ({
                  ...prev,
                  start_date: e.target.value,
                }))
              }
              sx={{
                width: 170,
                backgroundColor: "#FFFFFF",
              }}
            />

            <TextField
              type="date"
              size="small"
              label="To"
              slotProps={{
                inputLabel: {
                  shrink: true,
                },
                htmlInput: {
                  min: draftRange.start_date || undefined,
                },
              }}
              value={draftRange.end_date}
              onChange={(e) =>
                setDraftRange((prev) => ({
                  ...prev,
                  end_date: e.target.value,
                }))
              }
              sx={{
                width: 170,
                backgroundColor: "#FFFFFF",
              }}
            />

            {(draftRange.start_date || draftRange.end_date) && (
              <Button
                size="small"
                color="inherit"
                onClick={() => {
                  const defaults = getDefaultDateRange();
                  setDraftRange(defaults);
                  setAppliedRange(defaults);
                }}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  color: theme.palette.text.secondary,
                }}
              >
                Clear
              </Button>
            )}

            <Button
              variant="contained"
              size="small"
              disableElevation
              onClick={handleApplyDateRange}
              disabled={!dateRangeIsValid}
              sx={{
                height: 40,
                px: 2,
                borderRadius: 1.5,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Apply
            </Button>

            <Button
              variant="outlined"
              color="inherit"
              size="small"
              startIcon={<DownloadIcon fontSize="small" />}
              disabled={exportStatus?.type === "loading"}
              onClick={handleExportMenuOpen}
              sx={{
                height: 40,
                borderRadius: 1.5,
                textTransform: "none",
                fontWeight: 600,
                borderColor: theme.palette.divider,
                color: theme.palette.text.primary,
                backgroundColor: "#FFFFFF",

                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  borderColor: theme.palette.primary.light,
                  color: theme.palette.primary.main,
                },
              }}
            >
              {exportStatus?.type === "loading" ? "Exporting..." : "Export"}
            </Button>

            <ExportMenu
              anchorEl={exportMenuAnchor}
              onClose={handleExportMenuClose}
              onExport={(format: ExportFormat) => {
                handleExportMenuClose();
                exportReport(format);
              }}
            />
          </Stack>
        </Stack>

        {!dateRangeIsValid && (
          <Alert
            severity="warning"
            sx={{
              mb: 3,
              borderRadius: 2,
            }}
          >
            "From" date must be on or before "To" date.
          </Alert>
        )}

        {/* =================================================
                    SUMMARY CARDS
                ================================================= */}

        {report && (
          <Grid container spacing={2.25} sx={{ mb: 3 }}>
            {summaryCards.map((card) => (
              <Grid
                key={card.title}
                size={{
                  xs: 12,
                  sm: 6,
                  md: 4,
                  lg: 2.4,
                }}
              >
                <Card
                  elevation={0}
                  sx={{
                    position: "relative",
                    height: "100%",
                    minHeight: 130,
                    overflow: "hidden",
                    borderRadius: 2.5,
                    border: `1px solid ${COLORS.border}`,

                    backgroundColor: COLORS.cardBackground,

                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",

                    transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",

                    "&:hover": {
                      transform: "translateY(-4px)",

                      boxShadow: "0 8px 18px rgba(0,0,0,0.10)",
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      position: "relative",
                      zIndex: 1,
                      height: "100%",
                      boxSizing: "border-box",
                      p: 2.5,

                      "&:last-child": {
                        pb: 2.5,
                      },
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="flex-start"
                      justifyContent="space-between"
                    >
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: 0.6,
                          textTransform: "uppercase",
                          color: COLORS.mutedText,
                          pr: 1,
                        }}
                      >
                        {card.title}
                      </Typography>

                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          minWidth: 38,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: alpha(card.iconColor, 0.12),
                          color: card.iconColor,
                        }}
                      >
                        {card.icon}
                      </Box>
                    </Stack>

                    <Typography
                      sx={{
                        mt: 1.5,
                        fontSize: 28,
                        lineHeight: 1.2,
                        fontWeight: 700,
                        color: COLORS.text,
                      }}
                    >
                      {card.value}
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.5,
                        fontSize: 13,
                        lineHeight: 1.4,
                        color: COLORS.mutedText,
                      }}
                    >
                      {card.subtitle}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* =================================================
                    ANALYTICS — EXACTLY 2 PER ROW
                ================================================= */}

        {report && (
          <Grid container spacing={2.25} sx={{ mb: 3 }}>
            {/* ROW 1 */}

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <BreakdownSection
                title="Organization Status Breakdown"
                items={report.organization_status_breakdown}
                labelKey="status"
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <BreakdownSection
                title="Subscription Status Breakdown"
                items={report.subscription_status_breakdown}
                labelKey="status"
              />
            </Grid>

            {/* ROW 2 */}

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <BreakdownSection
                title="User Role Breakdown"
                items={report.user_role_breakdown}
                labelKey="role"
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <SubscriptionStatusDonutChart />
            </Grid>

            {/* ROW 3 */}

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <BreakdownSection
                title="User Status Breakdown"
                items={report.user_status_breakdown}
                labelKey="status"
              />
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <OrganizationGrowthChart />
            </Grid>

            {/* ROW 4 */}

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <MRRGrowthChart />
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <PlanDistributionChart />
            </Grid>

            {/* ROW 5 */}

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <CategoryMixChart />
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 6,
              }}
            >
              <SubscriptionChangesChart />
            </Grid>
          </Grid>
        )}

        {/* =================================================
                    ANIMATED EXPORT MESSAGE
                ================================================= */}

        <Snackbar
          open={exportStatus !== null}
          autoHideDuration={3500}
          onClose={() => setExportStatus(null)}
          slots={{
            transition: Grow,
          }}
          anchorOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
        >
          {exportStatus ? (
            <Alert
              severity={
                exportStatus.type === "success"
                  ? "success"
                  : exportStatus.type === "error"
                    ? "error"
                    : "info"
              }
              variant="filled"
              onClose={() => setExportStatus(null)}
              icon={
                exportStatus.type === "loading" ? (
                  <CircularProgress size={20} thickness={4} color="inherit" />
                ) : undefined
              }
              sx={{
                minWidth: 310,
                borderRadius: 2,
                fontSize: 14,
                fontWeight: 500,
                boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
              }}
            >
              {exportStatus.msg}
            </Alert>
          ) : (
            <span />
          )}
        </Snackbar>
      </Box>
    </Fade>
  );
};

export default SuperAdminReports;