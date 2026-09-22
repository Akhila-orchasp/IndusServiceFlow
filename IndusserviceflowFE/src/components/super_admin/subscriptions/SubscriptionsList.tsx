import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Chip,
  Select,
  Divider,
  IconButton,
  Avatar,
  Slide,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Apps as AllIcon,
  CheckCircle as ActiveIcon,
  Sync as TrialIcon,
  Warning as PendingIcon,
  Cancel as CancelledIcon,
  Delete as DeletedIcon,
  DateRange as CalendarIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ExpandMore as ExpandMoreIcon,
  Close as CloseIcon,
  AccountBalance as OrgIcon,
  Email as MailIcon,
  Delete as DeleteForeverIcon,
  RadioButtonUnchecked as PendingDotIcon,
  Block as CancelSubIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Restore as RestoreIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowRightAlt as ArrowRightIcon,
} from "@mui/icons-material";

import { getSubscriptions, exportSubscriptions, forceActivateSubscription, deleteSubscription, getOrganizations } from "../../../services/api";
import Toast from "../../common/Toast";
import type { ToastType } from "../../common/Toast";
import ExportMenu from "../../common/ExportMenu";
import { useConfirm } from "../../common/ConfirmDialog";

interface Subscription {
  id: number;
  subscription_number?: string; // e.g. "SUB-00001" - shown in the details panel
  organization_name: string;
  organization_email?: string;
  plan_name: string; // "Enterprise" | "Growth" | "Starter"
  plan_badge?: string; // e.g. "Popular"
  status: string; // raw lifecycle value, e.g. "Active" | "Pending Payment" | "Pending Activation" | "Cancelled" | "Expired" | "Locked"
  display_status?: string; // what to show the user: layers the org's approval state over `status` — "Pending" while the org awaits approval, "Cancelled" if the org was rejected, otherwise same as `status`
  billing_cycle: string; // "Monthly" | "Annual" | "Free Trial"
  employees: number;
  monthly_revenue: number;
  next_payment: string | null;
  days_left?: number | null; // days until next_payment
  customer_since: string | null;
  started_on?: string | null;
  payment_status?: string; // e.g. "Up to date"
  payment_method?: string; // e.g. "Razorpay"
}

interface PlanBreakdownRow {
  plan: string;
  active_orgs: number;
  share_pct: number;
  monthly_revenue: number;
}

const PLANS = ["All plans", "Enterprise", "Growth", "Starter", "Free Trial"];
const STATUSES = ["All statuses", "Active", "Pending", "Cancelled"];
const BILLING = ["All billing", "Monthly", "Annual"];
const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "started_on", label: "Recently started" },
  { value: "next_payment", label: "Next payment" },
  { value: "organization_name", label: "Organization" },
  { value: "monthly_revenue", label: "Amount" },
  { value: "customer_since", label: "Customer since" },
];
const DATE_RANGES = ["Last 7 days", "Last 30 days", "This month", "Custom range"];

type SortField =
  | "organization_name"
  | "employees"
  | "monthly_revenue"
  | "next_payment"
  | "customer_since"
  | "started_on";
type SortDir = "asc" | "desc";

const PLAN_DOT_COLOR: Record<string, string> = {
  enterprise: "#6366F1",
  growth: "#0F766E",
  starter: "#F59E0B",
  "free trial": "#9333EA",
};

const planDotColor = (plan: unknown) =>
  PLAN_DOT_COLOR[String(plan ?? "").toLowerCase()] ?? PLAN_DOT_COLOR.enterprise;

const statusMeta = (status: unknown): { label: string; color: "success" | "warning" | "error" | "default" | "info" } => {
  const raw = String(status ?? "");
  switch (raw.toLowerCase().replace(/\s+/g, "_")) {
    case "active":
      return { label: "Active", color: "success" };
    case "trial":
    case "on_trial":
      return { label: "Trial", color: "info" };
    case "expiring_soon":
      return { label: "Expiring soon", color: "warning" };
    case "expired":
      return { label: "Expired", color: "error" };
    case "pending":
    case "pending_payment":
    case "pending_activation":
      return { label: "Pending", color: "warning" };
    case "cancelled":
      return { label: "Cancelled", color: "default" };
    case "deleted":
      return { label: "Deleted", color: "default" };
    default:
      return { label: raw || "-", color: "default" };
  }
};

const formatINR = (value: number) => `₹${(value ?? 0).toLocaleString("en-IN")}`;

const formatDateTime = (d: Date) =>
  d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

const SubscriptionsList: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("All plans");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [billingFilter, setBillingFilter] = useState("All billing");
  const [dateRangeLabel, setDateRangeLabel] = useState("Jul 24 - Aug 24, 2026");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [sortField, setSortField] = useState<SortField>("started_on");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [summary, setSummary] = useState({
    total_subscriptions: 0,
    active_organizations: 0,
    on_trial: 0,
    past_due: 0,
    pending: 0,
    cancelled: 0,
    deleted_15_days: 0,
    totals: { employees: 0, monthly_revenue: 0 },
  });
  const [organizationsTotal, setOrganizationsTotal] = useState(0);

  const fetchOrganizationsTotal = async () => {
    try {
      const orgsRes = await getOrganizations({ page: 1, page_size: 1 });
      // "All Subscriptions" is one row per organization — every org gets a
      // subscription row the moment it registers (Pending Payment/Activation),
      // whatever happens to it afterwards. So this should be every non-deleted
      // org regardless of status: Active + Pending + Rejected (e.g. 16 + 0 + 1
      // = 17), not just the Active ones.
      setOrganizationsTotal(orgsRes?.counts?.total ?? 0);
    } catch (err) {
      console.error("Failed to load organizations total:", err);
    }
  };

  useEffect(() => {
    fetchOrganizationsTotal();
  }, []);

  // One subscription per eligible (Active) organization.
  const totalSubscriptions = organizationsTotal;

  const [planBreakdown] = useState<PlanBreakdownRow[]>([]);
  void planBreakdown; 
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [planAnchor, setPlanAnchor] = useState<null | HTMLElement>(null);
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);
  const [billingAnchor, setBillingAnchor] = useState<null | HTMLElement>(null);
  const [sortAnchor, setSortAnchor] = useState<null | HTMLElement>(null);
  const [dateAnchor, setDateAnchor] = useState<null | HTMLElement>(null);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const confirm = useConfirm();

  const handleActivateSubscription = async (sub: Subscription) => {
    try {
      setApproving(true);
      await forceActivateSubscription(sub.id);
      setToast({ message: `${sub.organization_name}'s subscription was activated.`, type: "success" });
      setSelectedSub((prev) => (prev && prev.id === sub.id ? { ...prev, status: "Active" } : prev));
      fetchSubscriptions();
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || "Failed to activate this subscription. Please try again.",
        type: "error",
      });
    } finally {
      setApproving(false);
    }
  };

  const handleDeleteSubscription = async (sub: Subscription) => {
    const ok = await confirm({
      title: "Delete this subscription?",
      message: `This removes the ${sub.plan_name} record for ${sub.organization_name}. This can't be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    });
    if (!ok) return;

    try {
      setDeleting(true);
      await deleteSubscription(sub.id);
      setToast({ message: `${sub.organization_name}'s subscription record was deleted.`, type: "success" });
      setSelectedSub((prev) => (prev && prev.id === sub.id ? null : prev));
      fetchSubscriptions();
    } catch (err: any) {
      setToast({
        message: err?.response?.data?.message || "Failed to delete this subscription. Please try again.",
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };
  const [orgHistory, setOrgHistory] = useState<Subscription[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!selectedSub) {
      setOrgHistory([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoadingHistory(true);
        // include_history=true bypasses the "one row per org" dedup so we
        // see the org's older plans too (e.g. the trial it upgraded from),
        // not just its current plan.
        const response = await getSubscriptions({
          search: selectedSub.organization_name,
          page_size: 50,
          include_history: true,
        });
        const rows: Subscription[] = (response?.data ?? []).filter(
          (r: Subscription) => r.organization_name === selectedSub.organization_name && r.id !== selectedSub.id,
        );
        if (!cancelled) setOrgHistory(rows);
      } catch (err) {
        console.error("Failed to load plan history:", err);
        if (!cancelled) setOrgHistory([]);
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedSub?.id, selectedSub?.organization_name]);
  const previousPlan = useMemo(() => {
    if (orgHistory.length === 0) return null;
    const sorted = [...orgHistory].sort((a, b) => {
      const aDate = a.customer_since || a.started_on || "";
      const bDate = b.customer_since || b.started_on || "";
      if (aDate && bDate) return new Date(bDate).getTime() - new Date(aDate).getTime();
      return b.id - a.id;
    });
    return sorted[0] ?? null;
  }, [orgHistory]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSubscriptions();
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, planFilter, statusFilter, billingFilter, page, pageSize, sortField, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [search, planFilter, statusFilter, billingFilter, pageSize]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, any> = {
        page,
        page_size: pageSize,
        sort_by: sortField,
        sort_dir: sortDir,
      };
      if (search.trim()) params.search = search.trim();
      if (planFilter !== "All plans") params.plan = planFilter;
      if (statusFilter !== "All statuses") params.status = statusFilter;
      if (billingFilter !== "All billing") params.billing_cycle = billingFilter;

      const response = await getSubscriptions(params);

      setSubscriptions(response?.data ?? []);
      setTotalRecords(response?.pagination?.total_records ?? 0);
      setTotalPages(response?.pagination?.total_pages ?? 1);

      setSummary((prev) => ({ ...prev, ...(response?.summary ?? {}) }));
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError("Failed to load subscriptions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      setExportAnchor(null);

      const params: Record<string, any> = {};
      if (search.trim()) params.search = search.trim();
      if (planFilter !== "All plans") params.plan = planFilter;
      if (statusFilter !== "All statuses") params.status = statusFilter;
      if (billingFilter !== "All billing") params.billing_cycle = billingFilter;

      const blobData = await exportSubscriptions(format, params);

      const mimeType =
        format === "pdf"
          ? "application/pdf"
          : format === "excel"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv";

      const blob = new Blob([blobData], { type: mimeType });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `subscriptions.${format === "excel" ? "xlsx" : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      setToast({
        type: "error",
        message: "Unable to export subscriptions. Check the console for details.",
      });
    }
  };

  const clearFilters = () => {
    setSearch("");
    setPlanFilter("All plans");
    setStatusFilter("All statuses");
    setBillingFilter("All billing");
  };
  const latestPerOrg = useMemo(() => {
    const byOrg = new Map<string, Subscription>();
    for (const sub of subscriptions) {
      const key = sub.organization_name;
      const existing = byOrg.get(key);
      if (!existing) {
        byOrg.set(key, sub);
        continue;
      }
      const existingDate = existing.started_on || existing.customer_since || "";
      const subDate = sub.started_on || sub.customer_since || "";
      const isNewer =
        subDate && existingDate
          ? new Date(subDate).getTime() > new Date(existingDate).getTime()
          : sub.id > existing.id;
      if (isNewer) byOrg.set(key, sub);
    }
    return Array.from(byOrg.values());
  }, [subscriptions]);
  const sortedSubscriptions = useMemo(() => {
    const rows = [...latestPerOrg];
    rows.sort((a, b) => {
      let av: any = a[sortField];
      let bv: any = b[sortField];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av == null) av = "";
      if (bv == null) bv = "";
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [latestPerOrg, sortField, sortDir]);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortField)?.label ?? "Next payment";

  const buildTimeline = (sub: Subscription) => {
    const events: { label: string; date: string; amount?: string; state: "done" | "current" | "upcoming" }[] = [];
    if (sub.started_on || sub.customer_since) {
      events.push({ label: "Subscription created", date: sub.started_on || sub.customer_since || "-", state: "done" });
    }
    if (sub.customer_since) {
      events.push({
        label: "Payment successful",
        date: sub.customer_since,
        amount: formatINR(sub.monthly_revenue),
        state: "done",
      });
    }
    if (sub.next_payment) {
      events.push({
        label: "Next payment",
        date: sub.next_payment,
        amount: sub.days_left != null ? `in ${sub.days_left} days` : undefined,
        state: "current",
      });
      events.push({ label: "Upcoming payment", date: "-", state: "upcoming" });
    }
    return events;
  };

  const metricCards = [
    {
      label: "All Subscriptions",
      sub: "One per organization",
      value: totalSubscriptions,
      icon: <AllIcon fontSize="small" />,
      color: "#2563EB",
    },
    {
      label: "Active",
      sub: "Active subscriptions",
      value: summary.active_organizations,
      icon: <ActiveIcon fontSize="small" />,
      color: "#16A34A",
    },
    {
      label: "Trial",
      sub: "On free trial",
      value: summary.on_trial,
      icon: <TrialIcon fontSize="small" />,
      color: "#9333EA",
    },
    {
      label: "Pending",
      sub: "Awaiting payment or approval",
      value: summary.pending,
      icon: <PendingIcon fontSize="small" />,
      color: "#EA580C",
    },
    {
      label: "Cancelled",
      sub: "Cancelled subscriptions",
      value: summary.cancelled,
      icon: <CancelledIcon fontSize="small" />,
      color: "#DC2626",
    },
    {
      label: "Deleted (15+ Days)",
      sub: "Permanently deleted",
      value: summary.deleted_15_days,
      icon: <DeletedIcon fontSize="small" />,
      color: "#64748B",
    },
  ];

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start" }}>
      {/* Main content */}
      <Box sx={{ flex: 1, minWidth: 0, px: { xs: 2, md: 4 }, py: 3.5 }}>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {/* Header */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
              Subscriptions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage organization subscriptions, billing status, renewals and account life-cycle.
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<CalendarIcon fontSize="small" />}
              endIcon={<ExpandMoreIcon fontSize="small" />}
              onClick={(e) => setDateAnchor(e.currentTarget)}
            >
              {dateRangeLabel}
            </Button>
            <Menu anchorEl={dateAnchor} open={Boolean(dateAnchor)} onClose={() => setDateAnchor(null)}>
              {DATE_RANGES.map((r) => (
                <MenuItem key={r} onClick={() => { setDateRangeLabel(r); setDateAnchor(null); }}>
                  {r}
                </MenuItem>
              ))}
            </Menu>

            <Button
              variant="contained"
              startIcon={<DownloadIcon fontSize="small" />}
              onClick={(e) => setExportAnchor(e.currentTarget)}
            >
              Export
            </Button>
            <ExportMenu anchorEl={exportAnchor} onClose={() => setExportAnchor(null)} onExport={handleExport} />
          </Box>
        </Box>

        {/* Metric cards */}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr", lg: "repeat(6, 1fr)" }, gap: 2, mb: 3 }}>
          {metricCards.map((card) => (
            <Card
              key={card.label}
              elevation={0}
              variant="outlined"
              sx={{ p: 2, borderRadius: 3, bgcolor: "background.paper" }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.25 }}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: `${card.color}1A`,
                    color: card.color,
                  }}
                >
                  {card.icon}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: card.color }}>
                  {card.label}
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
                {card.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {card.sub}
              </Typography>
            </Card>
          ))}
        </Box>

        {/* Filters */}
        <Card elevation={0} variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2.5 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
              <TextField
                size="small"
                placeholder="Search organization..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ width: { xs: "100%", sm: 240 } }}
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

              <Button variant="outlined" color="inherit" endIcon={<ExpandMoreIcon fontSize="small" />} onClick={(e) => setStatusAnchor(e.currentTarget)}>
                Status: {statusFilter === "All statuses" ? "All" : statusFilter}
              </Button>
              <Menu anchorEl={statusAnchor} open={Boolean(statusAnchor)} onClose={() => setStatusAnchor(null)}>
                {STATUSES.map((s) => (
                  <MenuItem key={s} selected={statusFilter === s} onClick={() => { setStatusFilter(s); setStatusAnchor(null); }}>
                    {s}
                  </MenuItem>
                ))}
              </Menu>

              <Button variant="outlined" color="inherit" endIcon={<ExpandMoreIcon fontSize="small" />} onClick={(e) => setPlanAnchor(e.currentTarget)}>
                Plan: {planFilter === "All plans" ? "All" : planFilter}
              </Button>
              <Menu anchorEl={planAnchor} open={Boolean(planAnchor)} onClose={() => setPlanAnchor(null)}>
                {PLANS.map((p) => (
                  <MenuItem key={p} selected={planFilter === p} onClick={() => { setPlanFilter(p); setPlanAnchor(null); }}>
                    {p}
                  </MenuItem>
                ))}
              </Menu>

              <Button variant="outlined" color="inherit" endIcon={<ExpandMoreIcon fontSize="small" />} onClick={(e) => setBillingAnchor(e.currentTarget)}>
                Billing: {billingFilter === "All billing" ? "All" : billingFilter}
              </Button>
              <Menu anchorEl={billingAnchor} open={Boolean(billingAnchor)} onClose={() => setBillingAnchor(null)}>
                {BILLING.map((b) => (
                  <MenuItem key={b} selected={billingFilter === b} onClick={() => { setBillingFilter(b); setBillingAnchor(null); }}>
                    {b}
                  </MenuItem>
                ))}
              </Menu>

              <Button color="inherit" startIcon={<RestoreIcon fontSize="small" />} onClick={clearFilters}>
                Clear filters
              </Button>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Sort by:
              </Typography>
              <Button variant="outlined" color="inherit" endIcon={<ExpandMoreIcon fontSize="small" />} onClick={(e) => setSortAnchor(e.currentTarget)}>
                {currentSortLabel}
              </Button>
              <Menu anchorEl={sortAnchor} open={Boolean(sortAnchor)} onClose={() => setSortAnchor(null)}>
                {SORT_OPTIONS.map((o) => (
                  <MenuItem key={o.value} selected={sortField === o.value} onClick={() => { setSortField(o.value); setSortAnchor(null); }}>
                    {o.label}
                  </MenuItem>
                ))}
              </Menu>
              <IconButton
                size="small"
                onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                title={sortDir === "asc" ? "Ascending" : "Descending"}
              >
                {sortDir === "asc" ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />}
              </IconButton>
            </Box>
          </Box>
        </Card>

        {/* Table */}
        <Card elevation={0} variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
          {loading ? (
            <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
              Loading subscriptions...
            </Typography>
          ) : error ? (
            <Typography color="error" sx={{ py: 6, textAlign: "center" }}>
              {error}
            </Typography>
          ) : subscriptions.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <OrgIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
                No subscriptions found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Try adjusting your search or filters.
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", bgcolor: "background.default" } }}>
                      <TableCell>Organization</TableCell>
                      <TableCell>Plan</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Billing cycle</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Customer since</TableCell>
                      <TableCell>Started on</TableCell>
                      <TableCell>Next payment</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedSubscriptions.map((sub) => {
                      const meta = statusMeta(sub.display_status ?? sub.status);
                      return (
                        <TableRow key={sub.id} hover>
                          <TableCell>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                              <Avatar variant="rounded" sx={{ width: 32, height: 32, bgcolor: "action.hover", color: "text.secondary" }}>
                                <OrgIcon fontSize="small" />
                              </Avatar>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {sub.organization_name}
                                </Typography>
                                {sub.organization_email && (
                                  <Typography variant="caption" color="text.secondary">
                                    {sub.organization_email}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: "flex", flexDirection: "column" }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: planDotColor(sub.plan_name) }} />
                                {sub.plan_name}
                              </Box>
                              {sub.plan_badge && (
                                <Typography variant="caption" sx={{ color: "warning.main", fontWeight: 600, ml: 2 }}>
                                  {sub.plan_badge}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={meta.label} color={meta.color} sx={{ fontWeight: 600 }} />
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Chip size="small" variant="outlined" label={sub.billing_cycle} />
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatINR(sub.monthly_revenue)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              / month
                            </Typography>
                          </TableCell>
                          <TableCell>{sub.customer_since || "-"}</TableCell>
                          <TableCell>{sub.started_on || sub.customer_since || "-"}</TableCell>
                          <TableCell>{sub.next_payment || "-"}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              color="inherit"
                              endIcon={<ExpandMoreIcon fontSize="small" />}
                              onClick={() => setSelectedSub(sub)}
                            >
                              View details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Divider />

              {/* Pagination */}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", justifyContent: "space-between", p: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {sortedSubscriptions.length} organization{sortedSubscriptions.length === 1 ? "" : "s"} on this page
                  {totalRecords > sortedSubscriptions.length && ` (of ${totalRecords} subscription records, incl. renewal history)`}
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Button size="small" disabled={page === 1} onClick={() => setPage(1)} sx={{ minWidth: 36, px: 1 }}>
                    <FirstPageIcon fontSize="small" />
                  </Button>
                  <Button size="small" disabled={page === 1} onClick={() => setPage((p) => p - 1)} sx={{ minWidth: 36, px: 1 }}>
                    <ChevronLeftIcon fontSize="small" />
                  </Button>
                  <Chip label={page} color="primary" size="small" sx={{ fontWeight: 700, minWidth: 32 }} />
                  <Button size="small" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} sx={{ minWidth: 36, px: 1 }}>
                    <ChevronRightIcon fontSize="small" />
                  </Button>
                  <Button size="small" disabled={page === totalPages} onClick={() => setPage(totalPages)} sx={{ minWidth: 36, px: 1 }}>
                    <LastPageIcon fontSize="small" />
                  </Button>
                </Box>

                <Select
                  size="small"
                  value={pageSize}
                  onChange={(e: SelectChangeEvent<number>) => setPageSize(Number(e.target.value))}
                  sx={{ minWidth: 100 }}
                >
                  {[10, 20, 50].map((size) => (
                    <MenuItem key={size} value={size}>
                      {size} / page
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            </>
          )}
        </Card>
        <Card elevation={0} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mt: 3 }}>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                bgcolor: "primary.50",
                color: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <DeleteForeverIcon fontSize="small" />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Account auto-deletion process
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
                We will send email reminders on days 5, 10 and 15 after the due date. After 15 days, the account
                and all associated data will be permanently deleted.
              </Typography>
            </Box>
          </Box>

          {/* Timeline */}
          <Box sx={{ display: "flex", alignItems: "center", mt: 4, px: { xs: 0, sm: 4 } }}>
            {[
              { label: "Day 5", sub: "First reminder email", icon: <MailIcon fontSize="small" /> },
              { label: "Day 10", sub: "Second reminder email", icon: <MailIcon fontSize="small" /> },
              { label: "Day 15", sub: "Final reminder email", icon: <MailIcon fontSize="small" /> },
              { label: "After 15+ days", sub: "Account deleted", icon: <DeleteForeverIcon fontSize="small" />, danger: true },
            ].map((step, idx, arr) => (
              <React.Fragment key={step.label}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 110 }}>
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: step.danger ? "error.main" : "primary.main",
                      color: "#fff",
                    }}
                  >
                    {step.icon}
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, mt: 1 }}>
                    {step.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center" }}>
                    {step.sub}
                  </Typography>
                </Box>
                {idx < arr.length - 1 && (
                  <Box sx={{ flex: 1, height: 2, bgcolor: "divider", mb: 3.5 }} />
                )}
              </React.Fragment>
            ))}
          </Box>
          <Typography variant="caption" sx={{ display: "block", textAlign: "center", color: "error.main", fontWeight: 600, mt: 1 }}>
            Permanently deleted
          </Typography>
        </Card>

        {/* Footer */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "space-between", alignItems: "center", mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            All times shown in Asia/Kolkata (IST) <InfoIcon sx={{ fontSize: 14 }} />
          </Typography>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              Last updated: {formatDateTime(lastUpdated)}
              <IconButton size="small" onClick={fetchSubscriptions}>
                <RefreshIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Typography>
          )}
        </Box>
      </Box>
      <Slide direction="left" in={Boolean(selectedSub)} mountOnEnter unmountOnExit timeout={300}>
        <Box
          sx={{
            width: 360,
            flexShrink: 0,
            borderLeft: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            height: "100vh",
            position: "sticky",
            top: 0,
            overflowY: "auto",
            p: 3,
          }}
        >
          {selectedSub && (
          <>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Subscription details
            </Typography>
            <IconButton size="small" onClick={() => setSelectedSub(null)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Org summary */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
            <Avatar variant="rounded" sx={{ bgcolor: "action.hover", color: "text.secondary", width: 44, height: 44 }}>
              <OrgIcon />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {selectedSub.organization_name}
              </Typography>
              {selectedSub.organization_email && (
                <Typography variant="caption" color="text.secondary">
                  {selectedSub.organization_email}
                </Typography>
              )}
            </Box>
            <Chip size="small" label={statusMeta(selectedSub.display_status ?? selectedSub.status).label} color={statusMeta(selectedSub.display_status ?? selectedSub.status).color} sx={{ fontWeight: 600 }} />
          </Box>
          {!loadingHistory && previousPlan && (
            <Box sx={{ mb: 2.5, p: 1.5, borderRadius: 2, bgcolor: "action.hover" }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                Plan change
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Chip
                  size="small"
                  variant="outlined"
                  label={previousPlan.plan_name}
                  sx={{ color: "text.secondary", textDecoration: "line-through" }}
                />
                <ArrowRightIcon fontSize="small" sx={{ color: "text.secondary" }} />
                <Chip size="small" color="primary" label={selectedSub.plan_name} sx={{ fontWeight: 700 }} />
              </Box>
              {orgHistory.length > 1 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                  +{orgHistory.length - 1} earlier plan{orgHistory.length - 1 === 1 ? "" : "s"} on record
                </Typography>
              )}
            </Box>
          )}

          <Divider sx={{ mb: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Subscription information
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 1.75, columnGap: 2, mb: 3 }}>
            <InfoField label="Subscription ID" value={selectedSub.subscription_number || `SUB-${String(selectedSub.id).padStart(5, "0")}`} />
            <InfoField
              label="Plan"
              value={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  {selectedSub.plan_name}
                  {selectedSub.plan_badge && (
                    <Chip label={selectedSub.plan_badge} size="small" color="warning" sx={{ height: 18, fontSize: 11, fontWeight: 700 }} />
                  )}
                </Box>
              }
            />
            <InfoField label="Billing cycle" value={selectedSub.billing_cycle} />
            <InfoField label="Amount" value={`${formatINR(selectedSub.monthly_revenue)} / month`} />
            <InfoField
              label="Started on"
              value={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  {selectedSub.started_on || selectedSub.customer_since || "-"}
                </Box>
              }
            />
            <InfoField
              label="Next payment"
              value={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {selectedSub.next_payment || "-"}
                  </Typography>
                  {selectedSub.days_left != null && (
                    <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                      in {selectedSub.days_left} days
                    </Typography>
                  )}
                </Box>
              }
            />
            <InfoField label="Customer since" value={selectedSub.customer_since || "-"} />
            <InfoField label="Employees" value={selectedSub.employees} />
            <InfoField
              label="Payment status"
              value={
                <Chip
                  size="small"
                  color="success"
                  variant="outlined"
                  label={selectedSub.payment_status || "Up to date"}
                  sx={{ fontWeight: 600 }}
                />
              }
            />
            <InfoField label="Payment method" value={selectedSub.payment_method || "-"} />
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Timeline */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Subscription timeline
          </Typography>
          <Box sx={{ mb: 3 }}>
            {buildTimeline(selectedSub).map((ev, idx, arr) => (
              <Box key={idx} sx={{ display: "flex", gap: 1.5 }}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {ev.state === "done" && <ActiveIcon sx={{ fontSize: 18, color: "success.main" }} />}
                  {ev.state === "current" && <ActiveIcon sx={{ fontSize: 18, color: "primary.main" }} />}
                  {ev.state === "upcoming" && <PendingDotIcon sx={{ fontSize: 18, color: "text.disabled" }} />}
                  {idx < arr.length - 1 && <Box sx={{ width: 2, flex: 1, bgcolor: "divider", my: 0.5 }} />}
                </Box>
                <Box sx={{ pb: 2.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {ev.date}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: ev.state === "upcoming" ? 400 : 600, color: ev.state === "upcoming" ? "text.disabled" : "text.primary" }}>
                    {ev.label}{" "}
                    {ev.amount && (
                      <Typography component="span" variant="body2" sx={{ fontWeight: 700, color: ev.state === "current" ? "success.main" : "text.secondary" }}>
                        {ev.amount}
                      </Typography>
                    )}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Actions */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Actions
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {selectedSub.status.toLowerCase().replace(/\s+/g, "_") === "pending_activation" && (
              <>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                  This should have activated automatically after payment. If it's stuck, you can activate it manually.
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  disableElevation
                  startIcon={<ActiveIcon fontSize="small" />}
                  disabled={approving}
                  onClick={() => handleActivateSubscription(selectedSub)}
                >
                  Activate Now
                </Button>
              </>
            )}
            {selectedSub.status.toLowerCase().replace(/\s+/g, "_") === "pending_payment" && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                This organization hasn't completed payment yet — nothing to do here until they do.
              </Typography>
            )}
            {selectedSub.status.toLowerCase().replace(/\s+/g, "_") === "active" && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                This subscription is active and can't be deleted. Cancel it first if it shouldn't be current.
              </Typography>
            )}
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<CancelSubIcon fontSize="small" />}
              disabled={deleting || selectedSub.status.toLowerCase().replace(/\s+/g, "_") === "active"}
              onClick={() => handleDeleteSubscription(selectedSub)}
            >
              Delete Record
            </Button>
          </Box>
          </>
          )}
        </Box>
      </Slide>
    </Box>
  );
};

const InfoField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.25 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600 }} component="div">
      {value}
    </Typography>
  </Box>
);

export default SubscriptionsList;