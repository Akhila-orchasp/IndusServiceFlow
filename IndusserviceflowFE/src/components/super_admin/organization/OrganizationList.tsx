import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useConfirm } from "../../common/ConfirmDialog";
import {
  Box,
  Typography,
  Card,
  TextField,
  InputAdornment,
  MenuItem,
  Menu,
  Button,
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
  Select,
  Dialog,
  DialogContent,
  Divider,
  alpha,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Restore as RestoreIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
  Check as ApproveIcon,
  Close as RejectIcon,
  Close as CloseIcon,
  Delete as DeleteIcon,
  MonitorHeart as HospitalIcon,
  MedicalServices as ClinicIcon,
  AccountBalance as BankIcon,
  ShoppingBag as RetailIcon,
  SupportAgent as SupportIcon,
  Apps as DefaultIcon,
  Layers as LayersIcon,
  AccessTime as ClockIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Tag as TagIcon,
  Public as CountryIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";

import {
  getOrganizations,
  getOrganizationById,
  approveOrganization,
  rejectOrganization,
  deleteOrganization,
  exportOrganizations,
  getSubscriptions,
  getCategories,
} from "../../../services/api";
import Toast from "../../common/Toast";
import type { ToastType } from "../../common/Toast";
import ExportMenu from "../../common/ExportMenu";

interface Organization {
  id: number;
  organization_name: string;
  category_name: string;
  category: number;
  email: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  status: string; // "pending" | "approved" | "rejected" | "active" | "inactive"
  created_by?: string | number | null;
  contact_person_name?: string | null;
  created_on?: string;
  updated_by?: string | number | null;
  updated_on?: string;
  is_deleted?: boolean;
  payment_status?: "pending" | "paid" | "failed";
  plan_name?: string;
  billing_cycle?: "monthly" | "annual" | "trial";
  payment_amount?: number;
  is_free_trial?: boolean;
}

const REQUEST_STATUSES = ["pending", "approved", "rejected"];
const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const REFRESH_MS = 30000;

const getCategoryIcon = (name: string) => {
  switch ((name || "").toLowerCase()) {
    case "hospitals":
    case "hospital":
      return <HospitalIcon fontSize="small" />;
    case "clinics":
    case "clinic":
      return <ClinicIcon fontSize="small" />;
    case "banks":
    case "bank":
      return <BankIcon fontSize="small" />;
    case "retail":
      return <RetailIcon fontSize="small" />;
    case "customer support":
    case "support center":
    case "support":
      return <SupportIcon fontSize="small" />;
    default:
      return <DefaultIcon fontSize="small" />;
  }
};

const typeLabel = (value: "all" | "request" | "organization") =>
  value === "all" ? "All types" : value === "request" ? "Requests" : "Organizations";

const statusLabel = (value: "all" | string) =>
  value === "all" ? "All statuses" : value.charAt(0).toUpperCase() + value.slice(1);

const categoryLabel = (value: "all" | string) => (value === "all" ? "All categories" : value);

const STATUS_COLOR: Record<string, "warning" | "success" | "error" | "default"> = {
  pending: "warning",
  approved: "success",
  rejected: "error",
  active: "success",
  inactive: "default",
};

const PAYMENT_STATUS_COLOR: Record<string, "warning" | "success" | "error" | "default"> = {
  pending: "warning",
  paid: "success",
  failed: "error",
};

const OrganizationList: React.FC = () => {
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const id = searchParams.get("view");

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [deepLinkedOrg, setDeepLinkedOrg] = useState<Organization | null>(null);

  const selectedOrg = useMemo(
    () => organizations.find((o) => String(o.id) === id) ?? deepLinkedOrg,
    [organizations, id, deepLinkedOrg]
  );

  useEffect(() => {
    if (!id || organizations.some((o) => String(o.id) === id)) {
      setDeepLinkedOrg(null);
      return;
    }
    getOrganizationById(id)
      .then((res) => setDeepLinkedOrg(res?.data ?? res ?? null))
      .catch(() => setDeepLinkedOrg(null));
  }, [id, organizations]);
  const [fallbackPlan, setFallbackPlan] = useState<{
    plan_name?: string;
    billing_cycle?: string;
    payment_status?: string;
    is_free_trial?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!selectedOrg || selectedOrg.plan_name || selectedOrg.payment_status) {
      setFallbackPlan(null);
      return;
    }
    let cancelled = false;
    getSubscriptions({ search: selectedOrg.organization_name, page_size: 1 })
      .then((res) => {
        if (cancelled) return;
        const match = (res?.data ?? res ?? [])[0];
        if (match && match.organization_name === selectedOrg.organization_name) {
          setFallbackPlan({
            plan_name: match.plan_name,
            billing_cycle: match.billing_cycle,
            payment_status: match.payment_status,
            is_free_trial: match.billing_cycle === "Free Trial",
          });
        } else {
          setFallbackPlan(null);
        }
      })
      .catch(() => setFallbackPlan(null));
    return () => {
      cancelled = true;
    };
  }, [selectedOrg]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null,
  );
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [typeFilter, setTypeFilter] = useState<"all" | "request" | "organization">(
    (searchParams.get("type") as "request" | "organization" | null) ?? "all",
  );
  const [statusFilter, setStatusFilter] = useState<"all" | string>(
    searchParams.get("status") ?? "all",
  );
  const [categoryFilter, setCategoryFilter] = useState<"all" | string>("all");
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  useEffect(() => {
    getCategories()
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setCategoryOptions(
          list
            .map((c: any) => c.category_name)
            .filter((name: unknown): name is string => typeof name === "string" && name.length > 0)
        );
      })
      .catch(() => setCategoryOptions([]));
  }, []);

  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [typeAnchor, setTypeAnchor] = useState<null | HTMLElement>(null);
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);
  const [categoryAnchor, setCategoryAnchor] = useState<null | HTMLElement>(null);

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
    setCategoryFilter("all");
  };

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [counts, setCounts] = useState({ total: 0, pending: 0, active: 0, rejected: 0 });
  const loadOrganizations = async (targetPage = page, opts: { silent?: boolean } = {}) => {
    const { silent = false } = opts;
    if (!silent) setLoading(true);
    if (!silent) setError(null);

    try {
      const [response, totalRes, pendingRes, activeRes, rejectedRes] = await Promise.all([
        getOrganizations({
          search: search.trim() || undefined,
          status: statusFilter === "all" ? undefined : statusFilter,
          type: typeFilter === "all" ? undefined : typeFilter,
          category_name: categoryFilter === "all" ? undefined : categoryFilter,
          page: targetPage,
          page_size: pageSize,
        }),
        getOrganizations({ page: 1, page_size: 1 }),
        getOrganizations({ page: 1, page_size: 1, status: "pending" }),
        getOrganizations({ page: 1, page_size: 1, status: "active" }),
        getOrganizations({ page: 1, page_size: 1, status: "rejected" }),
      ]);

      setOrganizations(Array.isArray(response?.data) ? response.data : []);
      setTotalRecords(response?.pagination?.total_records ?? 0);
      setTotalPages(Math.max(1, response?.pagination?.total_pages ?? 1));
      setPage(response?.pagination?.current_page ?? targetPage);
      setCounts({
        total: totalRes?.pagination?.total_records ?? 0,
        pending: pendingRes?.pagination?.total_records ?? 0,
        active: activeRes?.pagination?.total_records ?? 0,
        rejected: rejectedRes?.pagination?.total_records ?? 0,
      });
    } catch (err) {
      console.error(err);
      if (!silent) setError("Failed to load organizations. Please try again.");
    } finally {
      if (!silent) setLoading(false);
    }
  };
  useEffect(() => {
    const timer = setTimeout(() => loadOrganizations(1), 300);
    return () => clearTimeout(timer);
  }, [search, typeFilter, statusFilter, categoryFilter, pageSize]);
  useEffect(() => {
    const interval = setInterval(() => {
      loadOrganizations(page, { silent: true });
    }, REFRESH_MS);
    return () => clearInterval(interval);
  }, [search, typeFilter, statusFilter, categoryFilter, pageSize, page]);

  const openDetail = (orgId: number | string) => {
    const next = new URLSearchParams(searchParams);
    next.set("view", String(orgId));
    setSearchParams(next);
  };
  const closeDetail = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("view");
    setSearchParams(next);
  };

  const handleApprove = async (org: Organization) => {
    if (org.payment_status && org.payment_status !== "paid") {
      setToast({
        type: "error",
        message: "This organization hasn't completed payment yet. Approval is not available until payment is received.",
      });
      return;
    }

    const orgId = org.id;
    const previousOrganizations = organizations;

    setOrganizations((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, status: "approved" } : o))
    );
    setToast({
      type: "success",
      message:
        "Organization approved successfully. Login credentials have been emailed to the org admin.",
    });

    try {
      await approveOrganization(orgId);
      loadOrganizations(page, { silent: true });
    } catch (err: any) {
      console.error(err);
      setOrganizations(previousOrganizations);
      setToast({
        type: "error",
        message:
          err.response?.data?.message || "Failed to approve organization. Please try again.",
      });
    }
  };

  const handleReject = async (orgId: number) => {
    // Same optimistic pattern as handleApprove above.
    const previousOrganizations = organizations;

    setOrganizations((prev) =>
      prev.map((o) => (o.id === orgId ? { ...o, status: "rejected" } : o))
    );
    setToast({ type: "success", message: "Organization rejected successfully." });

    try {
      await rejectOrganization(orgId);
      loadOrganizations(page, { silent: true });
    } catch (err: any) {
      console.error(err);
      setOrganizations(previousOrganizations);
      setToast({
        type: "error",
        message:
          err.response?.data?.message || "Failed to reject organization. Please try again.",
      });
    }
  };

  const handleDelete = async (org: Organization) => {
    const ok = await confirm({
      title: "Delete organization?",
      message: (
        <>
          Do you really want to delete <strong>{org.organization_name}</strong>? This action
          cannot be undone.
        </>
      ),
      variant: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
    });
    if (!ok) return;

    try {
      await deleteOrganization(org.id);
      setToast({ type: "success", message: "Organization deleted successfully." });
      loadOrganizations(page, { silent: true });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: "Failed to delete organization. Please try again." });
    }
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      setExportAnchor(null);
      const blobData = await exportOrganizations(format, {
        search: search.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        type: typeFilter === "all" ? undefined : typeFilter,
        category_name: categoryFilter === "all" ? undefined : categoryFilter,
      });

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
      link.download = `organizations.${format === "excel" ? "xlsx" : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      setToast({
        type: "error",
        message: "Unable to export organizations. Check the console for details.",
      });
    }
  };

  const isRequestRow = (o: Organization) =>
    REQUEST_STATUSES.includes((o.status || "").toLowerCase());
  const goToPage = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, nextPage));
    if (clamped === page || loading) return;
    loadOrganizations(clamped);
  };

  const initials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };
  const summaryTiles = [
    { label: "Total", value: counts.total, icon: <LayersIcon fontSize="small" />, color: "#0F766E" },
    { label: "Pending requests", value: counts.pending, icon: <ClockIcon fontSize="small" />, color: "#D97706" },
    { label: "Active", value: counts.active, icon: <CheckCircleIcon fontSize="small" />, color: "#16A34A" },
    { label: "Rejected", value: counts.rejected, icon: <RejectIcon fontSize="small" />, color: "#DC2626" },
  ];

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5 }}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
          Organizations
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage organizations and onboarding requests in one place.
        </Typography>
      </Box>

      {/* Summary cards */}
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
      <Card
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          bgcolor: "background.paper",
          boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
        }}
      >
        {/* Toolbar */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
          <TextField
            size="small"
            placeholder="Search organizations & requests"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: "100%", sm: 320 }, bgcolor: "background.paper" }}
            slotProps={{ input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            } }}
          />

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<FilterIcon fontSize="small" />}
              onClick={(e) => setTypeAnchor(e.currentTarget)}
            >
              {typeLabel(typeFilter)}
            </Button>
            <Menu
              anchorEl={typeAnchor}
              open={Boolean(typeAnchor)}
              onClose={() => setTypeAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 160, mt: 0.5 } } }}
            >
              <MenuItem onClick={() => { setTypeFilter("all"); setTypeAnchor(null); }}>All types</MenuItem>
              <MenuItem onClick={() => { setTypeFilter("organization"); setTypeAnchor(null); }}>Organizations</MenuItem>
              <MenuItem onClick={() => { setTypeFilter("request"); setTypeAnchor(null); }}>Requests</MenuItem>
            </Menu>

            <Button
              variant="outlined"
              color="inherit"
              startIcon={<FilterIcon fontSize="small" />}
              onClick={(e) => setStatusAnchor(e.currentTarget)}
            >
              {statusLabel(statusFilter)}
            </Button>
            <Menu
              anchorEl={statusAnchor}
              open={Boolean(statusAnchor)}
              onClose={() => setStatusAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 160, mt: 0.5 } } }}
            >
              <MenuItem onClick={() => { setStatusFilter("all"); setStatusAnchor(null); }}>All statuses</MenuItem>
              <MenuItem onClick={() => { setStatusFilter("pending"); setStatusAnchor(null); }}>Pending</MenuItem>
              <MenuItem onClick={() => { setStatusFilter("rejected"); setStatusAnchor(null); }}>Rejected</MenuItem>
              <MenuItem onClick={() => { setStatusFilter("active"); setStatusAnchor(null); }}>Active</MenuItem>
            </Menu>

            <Button
              variant="outlined"
              color="inherit"
              startIcon={<FilterIcon fontSize="small" />}
              onClick={(e) => setCategoryAnchor(e.currentTarget)}
            >
              {categoryLabel(categoryFilter)}
            </Button>
            <Menu
              anchorEl={categoryAnchor}
              open={Boolean(categoryAnchor)}
              onClose={() => setCategoryAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 180, mt: 0.5 } } }}
            >
              <MenuItem onClick={() => { setCategoryFilter("all"); setCategoryAnchor(null); }}>All categories</MenuItem>
              {categoryOptions.map((cat) => (
                <MenuItem key={cat} onClick={() => { setCategoryFilter(cat); setCategoryAnchor(null); }}>
                  {cat}
                </MenuItem>
              ))}
            </Menu>

            <Button
              variant="outlined"
              color="inherit"
              startIcon={<DownloadIcon fontSize="small" />}
              onClick={(e) => setExportAnchor(e.currentTarget)}
            >
              Export
            </Button>
            <ExportMenu
              anchorEl={exportAnchor}
              onClose={() => setExportAnchor(null)}
              onExport={handleExport}
            />

            <Button color="inherit" startIcon={<RestoreIcon fontSize="small" />} onClick={clearFilters}>
              Clear filters
            </Button>
          </Box>
        </Box>

        {/* Table */}
        {loading ? (
          <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
            Loading organizations...
          </Typography>
        ) : error ? (
          <Typography color="error" sx={{ py: 6, textAlign: "center" }}>
            {error}
          </Typography>
        ) : organizations.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <DefaultIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
              No organizations found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search or filters.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ borderRadius: 3, overflowX: "auto", overflowY: "hidden" }}
            >
              <Table sx={{ minWidth: 880 }}>
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", bgcolor: "background.default", whiteSpace: "nowrap" } }}>
                  <TableCell>Organization</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" sx={{ minWidth: 132 }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {organizations.map((org) => {
                  const rowIsRequest = isRequestRow(org);
                  const statusLower = (org.status || "").toLowerCase();
                  return (
                    <TableRow key={org.id} hover>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark", fontWeight: 700, fontSize: 13 }}>
                            {initials(org.organization_name)}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                              {org.organization_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {[org.city, org.state, org.pincode].filter(Boolean).join(" · ")}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Chip
                          size="small"
                          icon={getCategoryIcon(org.category_name)}
                          label={org.category_name}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{org.email}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{org.mobile}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{rowIsRequest ? "Request" : "Organization"}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        <Chip
                          size="small"
                          label={org.status ? org.status.charAt(0).toUpperCase() + org.status.slice(1) : "-"}
                          color={STATUS_COLOR[statusLower] ?? "default"}
                          icon={statusLower === "pending" ? <ClockIcon fontSize="small" /> : undefined}
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ minWidth: 132 }}>
                        <Box sx={{ display: "flex", justifyContent: "flex-end", flexWrap: "nowrap", gap: 0.25 }}>
                          <Tooltip title="View">
                            <IconButton size="small" onClick={() => openDetail(org.id)}>
                              <ViewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {rowIsRequest && statusLower === "pending" && (
                            <>
                              <Tooltip
                                title={
                                  org.payment_status && org.payment_status !== "paid"
                                    ? "Payment not received yet — approval unavailable until payment is complete"
                                    : "Approve"
                                }
                              >
                                <span>
                                  <IconButton
                                    size="small"
                                    color="success"
                                    disabled={!!org.payment_status && org.payment_status !== "paid"}
                                    onClick={() => handleApprove(org)}
                                  >
                                    <ApproveIcon fontSize="small" />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Reject">
                                <IconButton size="small" color="error" onClick={() => handleReject(org.id)}>
                                  <RejectIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDelete(org)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </TableContainer>

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", justifyContent: "space-between", mt: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {totalRecords === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalRecords)} of {totalRecords}
                </Typography>
                <Select
                  size="small"
                  value={pageSize}
                  onChange={(e: SelectChangeEvent<number>) => setPageSize(Number(e.target.value))}
                  sx={{ minWidth: 100 }}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <MenuItem key={size} value={size}>
                      {size} / page
                    </MenuItem>
                  ))}
                </Select>
              </Box>

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

      {/* Detail modal */}
      <Dialog
        open={Boolean(selectedOrg)}
        onClose={() => closeDetail()}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        {selectedOrg && (
          <DialogContent sx={{ p: 3.5, position: "relative" }}>
            <IconButton
              size="small"
              onClick={() => closeDetail()}
              sx={{ position: "absolute", top: 12, right: 12 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2.5 }}>
              <Avatar sx={{ width: 52, height: 52, bgcolor: "primary.light", color: "primary.dark", fontWeight: 700, fontSize: 18 }}>
                {initials(selectedOrg.organization_name)}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {selectedOrg.organization_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedOrg.category_name} · {isRequestRow(selectedOrg) ? "Request" : "Organization"}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 2.5 }} />

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5 }}>
              <DetailField icon={<PersonIcon fontSize="small" />} label="Contact person" value={String(selectedOrg.contact_person_name || "Not provided")} />
              <DetailField label="Status" value={selectedOrg.status} capitalize />
              <DetailField icon={<EmailIcon fontSize="small" />} label="Email" value={selectedOrg.email} />
              <DetailField icon={<PhoneIcon fontSize="small" />} label="Mobile" value={selectedOrg.mobile} />
              <Box sx={{ gridColumn: "1 / -1" }}>
                <DetailField icon={<LocationIcon fontSize="small" />} label="Address" value={selectedOrg.address || "-"} />
              </Box>
              <DetailField label="City" value={selectedOrg.city} />
              <DetailField label="State" value={selectedOrg.state} />
              <DetailField icon={<TagIcon fontSize="small" />} label="Pincode" value={selectedOrg.pincode} />
              <DetailField icon={<CountryIcon fontSize="small" />} label="Country" value={selectedOrg.country} />
            </Box>
            {(selectedOrg.plan_name || selectedOrg.payment_status || fallbackPlan) && (
              <>
                <Divider sx={{ my: 2.5 }} />
                <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Subscription &amp; payment
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2.5, mt: 1 }}>
                  <DetailField label="Plan" value={selectedOrg.plan_name || fallbackPlan?.plan_name || "-"} />
                  <DetailField
                    label="Billing cycle"
                    value={
                      selectedOrg.is_free_trial || fallbackPlan?.is_free_trial
                        ? "Free Trial"
                        : selectedOrg.billing_cycle
                        ? selectedOrg.billing_cycle.charAt(0).toUpperCase() + selectedOrg.billing_cycle.slice(1)
                        : fallbackPlan?.billing_cycle || "-"
                    }
                  />
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                      Payment status
                    </Typography>
                    {selectedOrg.payment_status ? (
                      <Chip
                        size="small"
                        label={
                          selectedOrg.is_free_trial
                            ? "Trial"
                            : selectedOrg.payment_status.charAt(0).toUpperCase() + selectedOrg.payment_status.slice(1)
                        }
                        color={PAYMENT_STATUS_COLOR[selectedOrg.payment_status] ?? "default"}
                        sx={{ fontWeight: 700 }}
                      />
                    ) : fallbackPlan?.payment_status ? (
                      <Chip size="small" label={fallbackPlan.payment_status} sx={{ fontWeight: 700 }} />
                    ) : (
                      <Typography variant="body2">-</Typography>
                    )}
                  </Box>
                  <DetailField
                    label="Payment amount"
                    value={
                      selectedOrg.payment_amount != null
                        ? `₹${selectedOrg.payment_amount.toLocaleString("en-IN")}`
                        : "-"
                    }
                  />
                  <DetailField
                    label="Registration date"
                    value={selectedOrg.created_on ? new Date(selectedOrg.created_on).toLocaleDateString() : "-"}
                  />
                </Box>
              </>
            )}

            {isRequestRow(selectedOrg) && (selectedOrg.status || "").toLowerCase() === "pending" && (
              <Box sx={{ display: "flex", justifyContent: "center", gap: 1.5, mt: 3 }}>
                <Tooltip
                  title={
                    selectedOrg.payment_status && selectedOrg.payment_status !== "paid"
                      ? "Payment not received yet — approval unavailable until payment is complete"
                      : ""
                  }
                >
                  <span>
                    <Button
                      variant="outlined"
                      color="success"
                      disabled={!!selectedOrg.payment_status && selectedOrg.payment_status !== "paid"}
                      onClick={() => {
                        handleApprove(selectedOrg);
                        closeDetail();
                      }}
                    >
                      Approve
                    </Button>
                  </span>
                </Tooltip>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    handleReject(selectedOrg.id);
                    closeDetail();
                  }}
                >
                  Reject
                </Button>
              </Box>
            )}
          </DialogContent>
        )}
      </Dialog>
    </Box>
  );
};

const DetailField = ({
  icon,
  label,
  value,
  capitalize,
}: {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  capitalize?: boolean;
}) => (
  <Box>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.25 }}
    >
      {icon}
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600, textTransform: capitalize ? "capitalize" : "none" }}>
      {value}
    </Typography>
  </Box>
);

export default OrganizationList;