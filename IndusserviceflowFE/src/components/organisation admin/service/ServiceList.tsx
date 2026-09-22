import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  Typography,
  Stack,
  Button,
  Chip,
  Paper,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Layers as LayersIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ClockIcon,
  Sell as TagIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  WorkspacePremium as UpgradeIcon,
} from "@mui/icons-material";
import {
  getServicesPaged,
  getServiceSummary,
  deleteService,
  exportServices,
} from "../../../services/catalogService";
import type { CatalogService, ServiceSummary } from "../../../services/catalogService";
import AddService from "./AddService";
import EditService from "./EditService";
import { useConfirm } from "../../common/ConfirmDialog";
import ExportMenu from "../../common/ExportMenu";
import usePlanAccess from "../../../hooks/usePlanAccess";
import RenewPlanDialog from "../../subscription/RenewPlanDialog";

const PAGE_SIZE = 10;

const STATUS_FILTERS: Array<"All statuses" | "Active" | "Inactive"> = [
  "All statuses",
  "Active",
  "Inactive",
];

const formatFee = (fee: string) => {
  const num = Number(fee);
  if (Number.isNaN(num)) return fee;
  return `₹ ${num.toLocaleString("en-IN")}`;
};

const statChip = { display: "flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 2.5 };

const cardSx = {
  borderRadius: 3,
  bgcolor: "background.paper",
  boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
};

const statCardSx = {
  ...cardSx,
  p: 2.25,
};

const ServiceList = () => {
  const confirm = useConfirm();
  const orgId = localStorage.getItem("org_id") || undefined;
  const orgName = localStorage.getItem("org_name") || "Your organization";
  const { isReadOnly, queueLimit, canAddService, blockedReason, refetch: refetchPlan } = usePlanAccess();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [services, setServices] = useState<CatalogService[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<ServiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [, setRefreshTick] = useState(0);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All statuses" | "Active" | "Inactive">(
    "All statuses"
  );
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const loadServices = useCallback(
    (targetPage = page, opts: { silent?: boolean } = {}) => {
      const { silent = false } = opts;
      if (!silent) setLoading(true);
      if (!silent) setError(null);

      getServicesPaged(orgId, {
        search: query.trim() || undefined,
        status: statusFilter === "All statuses" ? undefined : statusFilter,
        page: targetPage,
        page_size: PAGE_SIZE,
      })
        .then((res) => {
          const body = res.data;
          setServices(Array.isArray(body?.data) ? body.data : []);
          setTotalRecords(body?.pagination?.total_records ?? 0);
          setTotalPages(Math.max(1, body?.pagination?.total_pages ?? 1));
          setPage(body?.pagination?.current_page ?? targetPage);
          setLastUpdated(new Date());
        })
        .catch(() => {
          if (!silent) setError("Couldn't load services. Please try again.");
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [orgId, query, statusFilter]
  );

  const loadSummary = useCallback(() => {
    getServiceSummary(orgId, query.trim() || undefined)
      .then((res) => setSummary(res.data))
      .catch(() => setSummary(null));
  }, [orgId, query]);
  useEffect(() => {
    const timer = setTimeout(() => {
      loadServices(1);
      loadSummary();
    }, 300);
    return () => clearTimeout(timer);
  }, [query, statusFilter, orgId]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadServices(page, { silent: true });
      loadSummary();
    }, 30000);
    return () => clearInterval(interval);
  }, [query, statusFilter, orgId, page]);
  useEffect(() => {
    const ticker = setInterval(() => setRefreshTick((t) => t + 1), 30000);
    return () => clearInterval(ticker);
  }, []);

  const goToPage = (nextPage: number) => {
    const clamped = Math.max(1, Math.min(totalPages, nextPage));
    if (clamped === page || loading) return;
    loadServices(clamped);
  };

  const updatedLabel = useMemo(() => {
    if (!lastUpdated) return null;
    const seconds = Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000));
    if (seconds < 5) return "Updated just now";
    if (seconds < 60) return `Updated ${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    return `Updated ${minutes}m ago`;
  }, [lastUpdated]);

  const totals = {
    total: summary?.totalServices ?? 0,
    active: summary?.activeServices ?? 0,
    inactive: summary?.inactiveServices ?? 0,
  };

  const rangeStart = totalRecords === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalRecords);

  const handleDelete = async (svc: CatalogService) => {
    const ok = await confirm({
      title: "Delete service?",
      message: (
        <>
          Delete <strong>"{svc.service_name}"</strong>? This cannot be undone.
        </>
      ),
      variant: "danger",
      confirmText: "Delete",
    });
    if (!ok) return;
    setBusyId(svc.service_id);
    try {
      await deleteService(svc.service_id);
      loadServices();
      loadSummary();
    } catch {
      setError("Couldn't delete this service.");
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    setExporting(true);
    setExportAnchor(null);
    try {
      await exportServices(format, orgId, {
        search: query.trim() || undefined,
        status: statusFilter === "All statuses" ? undefined : statusFilter,
      });
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" } }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.25 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Services
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
              Catalogue of services your customers can book
              {updatedLabel ? ` · ${updatedLabel}` : ""}
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon fontSize="small" />} onClick={() => setShowAddModal(true)}>
            Add service
          </Button>
        </Stack>

        {!isReadOnly && queueLimit.reached && (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1.5,
              px: 2.5,
              py: 1.25,
              borderRadius: 2,
              bgcolor: "warning.light",
              color: "#7C4A03",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              You've reached your plan's limit of {queueLimit.limit} active service{queueLimit.limit === 1 ? "" : "s"}.
              Upgrade your plan to add more, or keep using your current plan as-is.
            </Typography>
            <Button
              size="small"
              variant="contained"
              color="warning"
              disableElevation
              startIcon={<UpgradeIcon fontSize="small" />}
              onClick={() => setShowUpgrade(true)}
              sx={{ flexShrink: 0 }}
            >
              Upgrade Plan
            </Button>
          </Box>
        )}

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
          <Card elevation={0} sx={{ ...statCardSx, display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ ...statChip, bgcolor: "rgba(20,184,166,0.12)", color: "#0f766e" }}>
              <LayersIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                {totals.total}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total services
              </Typography>
            </Box>
          </Card>
          <Card elevation={0} sx={{ ...statCardSx, display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ ...statChip, bgcolor: "rgba(34,197,94,0.12)", color: "success.dark" }}>
              <CheckCircleIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                {totals.active}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active
              </Typography>
            </Box>
          </Card>
          <Card elevation={0} sx={{ ...statCardSx, display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ ...statChip, bgcolor: "rgba(239,68,68,0.12)", color: "error.dark" }}>
              <CancelIcon />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1 }}>
                {totals.inactive}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Inactive
              </Typography>
            </Box>
          </Card>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Card elevation={0} sx={{ p: { xs: 2, sm: 3 }, ...cardSx }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, justifyContent: "space-between", mb: 2.5 }}>
            <TextField
              size="small"
              placeholder="Search services..."
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
                onClick={(e) => setFilterAnchor(e.currentTarget)}
              >
                {statusFilter}
              </Button>
              <Menu anchorEl={filterAnchor} open={Boolean(filterAnchor)} onClose={() => setFilterAnchor(null)}>
                {STATUS_FILTERS.map((s) => (
                  <MenuItem
                    key={s}
                    selected={statusFilter === s}
                    onClick={() => {
                      setStatusFilter(s);
                      setFilterAnchor(null);
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
              <ExportMenu
                anchorEl={exportAnchor}
                onClose={() => setExportAnchor(null)}
                onExport={handleExport}
              />
            </Box>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", bgcolor: "background.default" } }}>
                  <TableCell>Service Name</TableCell>
                  <TableCell>Service Type</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Fee</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ color: "text.secondary", py: 4 }}>
                      <CircularProgress size={20} />
                    </TableCell>
                  </TableRow>
                )}

                {!loading && services.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ color: "text.secondary", py: 4 }}>
                      {query ? `No services match "${query}".` : "No services yet."}
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  services.map((svc) => {
                    return (
                      <TableRow
                        hover
                        key={svc.service_id}
                        sx={{
                          transition: "background-color .12s ease",
                          "&:last-of-type td": { borderBottom: 0 },
                        }}
                      >
                        <TableCell sx={{ fontWeight: 600 }}>{svc.service_name}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            variant="outlined"
                            icon={
                              <Box
                                sx={{
                                  width: 20,
                                  height: 20,
                                  ml: "4px !important",
                                  borderRadius: "6px",
                                  bgcolor: "secondary.main",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <TagIcon sx={{ fontSize: 12, color: "#fff" }} />
                              </Box>
                            }
                            label={svc.service_type_name}
                            sx={{
                              bgcolor: "background.paper",
                              borderColor: "divider",
                              color: "text.primary",
                              fontWeight: 700,
                              "& .MuiChip-icon": { mr: "6px" },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            variant="outlined"
                            icon={<ClockIcon sx={{ fontSize: 14 }} />}
                            label={`${svc.duration} min`}
                          />
                        </TableCell>
                        <TableCell>{formatFee(svc.fee)}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={svc.status}
                            color={svc.status === "Active" ? "success" : "error"}
                            variant={svc.status === "Active" ? "filled" : "outlined"}
                            sx={{ fontWeight: 700, borderRadius: 999, color: svc.status === "Active" ? "#fff" : undefined }}
                          />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title={isReadOnly ? blockedReason() ?? "" : "Edit"}>
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={isReadOnly}
                                  onClick={() => setEditingServiceId(svc.service_id)}
                                  sx={{ color: "primary.main" }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title={isReadOnly ? blockedReason() ?? "" : "Delete"}>
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={isReadOnly || busyId === svc.service_id}
                                  onClick={() => handleDelete(svc)}
                                  sx={{ color: "error.main" }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", justifyContent: "space-between", pt: 2 }}>
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
        </Card>
      </Stack>

      {showAddModal && (
        <AddService
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            loadServices(1);
            loadSummary();
          }}
        />
      )}

      {showUpgrade && (
        <RenewPlanDialog
          open={showUpgrade}
          onClose={() => setShowUpgrade(false)}
          organizationName={orgName}
          onRenewed={() => {
            refetchPlan();
          }}
          title="Upgrade your plan"
          subtitle="Pick a plan with a higher service limit to keep adding services."
          confirmLabel="Upgrade Now"
        />
      )}

      {editingServiceId !== null && (
        <EditService
          serviceId={editingServiceId}
          onClose={() => setEditingServiceId(null)}
          onUpdated={() => {
            setEditingServiceId(null);
            loadServices();
            loadSummary();
          }}
        />
      )}
    </Box>
  );
};

export default ServiceList; 