import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  Typography,
  Stack,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material";
import {
  Search as SearchIcon,
  Tune as FilterIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Layers as LayersIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import {
  getServiceTypesPaged,
  getServiceTypeSummary,
  deleteServiceType,
  exportServiceTypes,
} from "../../../services/catalogService";
import type { ServiceType, ServiceTypeSummary } from "../../../services/catalogService";
import AddServiceType from "./AddServiceType";
import EditServiceType from "./EditServiceType";
import { useConfirm } from "../../common/ConfirmDialog";
import ExportMenu from "../../common/ExportMenu";

const PAGE_SIZE = 9;

const STATUS_FILTERS: Array<"All statuses" | "Active" | "Inactive"> = [
  "All statuses",
  "Active",
  "Inactive",
];

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
const categoryCardSx = {
  ...cardSx,
  p: 2.25,
  transition: "box-shadow .15s, transform .15s",
  "&:hover": { boxShadow: "0 10px 26px rgba(15,23,42,0.12)", transform: "translateY(-1px)" },
};

const ServiceTypeList = () => {
  const confirm = useConfirm();
  const orgId = localStorage.getItem("org_id") || undefined;

  const [categories, setCategories] = useState<ServiceType[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<ServiceTypeSummary | null>(null);
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
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const loadCategories = useCallback(
    (targetPage = page, opts: { silent?: boolean } = {}) => {
      const { silent = false } = opts;
      if (!silent) setLoading(true);
      if (!silent) setError(null);

      getServiceTypesPaged(orgId, {
        search: query.trim() || undefined,
        status: statusFilter === "All statuses" ? undefined : statusFilter,
        page: targetPage,
        page_size: PAGE_SIZE,
      })
        .then((catRes) => {
          const body = catRes.data;
          setCategories(Array.isArray(body?.data) ? body.data : []);
          setTotalRecords(body?.pagination?.total_records ?? 0);
          setTotalPages(Math.max(1, body?.pagination?.total_pages ?? 1));
          setPage(body?.pagination?.current_page ?? targetPage);
          setLastUpdated(new Date());
        })
        .catch(() => {
          if (!silent) setError("Couldn't load service categories. Please try again.");
        })
        .finally(() => {
          if (!silent) setLoading(false);
        });
    },
    [orgId, query, statusFilter]
  );

  const loadSummary = useCallback(() => {
    getServiceTypeSummary(orgId, query.trim() || undefined)
      .then((res) => setSummary(res.data))
      .catch(() => setSummary(null));
  }, [orgId, query]);
  useEffect(() => {
    const timer = setTimeout(() => {
      loadCategories(1);
      loadSummary();
    }, 300);
    return () => clearTimeout(timer);
  }, [query, statusFilter, orgId]);
  useEffect(() => {
    const interval = setInterval(() => {
      loadCategories(page, { silent: true });
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
    loadCategories(clamped);
  };

  const updatedLabel = useMemo(() => {
    if (!lastUpdated) return null;
    const seconds = Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 1000));
    if (seconds < 5) return "Updated just now";
    if (seconds < 60) return `Updated ${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    return `Updated ${minutes}m ago`;
  }, [lastUpdated]);
  const countsByType = useMemo(() => {
    const map = new Map<number, number>();
    for (const cat of categories) {
      map.set(cat.service_type_id, cat.services_count ?? 0);
    }
    return map;
  }, [categories]);

  const totals = {
    total: summary?.totalServiceTypes ?? 0,
    active: summary?.activeServiceTypes ?? 0,
    inactive: summary?.inactiveServiceTypes ?? 0,
  };

  const rangeStart = totalRecords === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalRecords);

  const handleDelete = async (cat: ServiceType) => {
    const ok = await confirm({
      title: "Delete service type?",
      message: (
        <>
          Delete <strong>"{cat.service_type_name}"</strong>? This cannot be undone.
        </>
      ),
      variant: "danger",
      confirmText: "Delete",
    });
    if (!ok) return;
    setBusyId(cat.service_type_id);
    try {
      await deleteServiceType(cat.service_type_id);
      loadCategories();
      loadSummary();
    } catch {
      setError("Couldn't delete this category.");
    } finally {
      setBusyId(null);
    }
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    setExporting(true);
    setExportAnchor(null);
    try {
      await exportServiceTypes(format, orgId, {
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
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.25 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                Service Categories
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
              Organize services into logical business categories.
              {updatedLabel ? ` · ${updatedLabel}` : ""}
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon fontSize="small" />} onClick={() => setShowAddModal(true)}>
            Add service type
          </Button>
        </Stack>

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
                Total categories
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
              placeholder="Search categories..."
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

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={26} />
            </Box>
          ) : categories.length === 0 ? (
            <Box sx={{ textAlign: "center", color: "text.secondary", py: 5 }}>
              {query ? `No categories match "${query}".` : "No service categories yet."}
            </Box>
          ) : (
            <>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2 }}>
                {categories.map((cat) => (
                  <Card
                    key={cat.service_type_id}
                    elevation={0}
                    onClick={() => setEditingCategoryId(cat.service_type_id)}
                    sx={{
                      ...categoryCardSx,
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                    }}
                  >
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Box sx={{ ...statChip, width: 40, height: 40, bgcolor: "rgba(20,184,166,0.12)", color: "#0f766e" }}>
                        <LayersIcon fontSize="small" />
                      </Box>
                      <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          size="small"
                          title="Edit"
                          onClick={() => setEditingCategoryId(cat.service_type_id)}
                          sx={{ color: "primary.main" }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          title="Delete"
                          disabled={busyId === cat.service_type_id}
                          onClick={() => handleDelete(cat)}
                          sx={{ color: "error.main" }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>

                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                        {cat.service_type_name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {cat.description || "No description provided."}
                      </Typography>
                    </Box>

                    <Stack direction="row" sx={{ mt: "auto", pt: 1, justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        <strong>{countsByType.get(cat.service_type_id) ?? 0}</strong> Services
                      </Typography>
                      <Chip
                        size="small"
                        label={cat.status}
                        color={cat.status === "Active" ? "success" : "error"}
                        variant={cat.status === "Active" ? "filled" : "outlined"}
                        sx={{ fontWeight: 600 }}
                      />
                    </Stack>
                  </Card>
                ))}
              </Box>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", justifyContent: "space-between", pt: 3 }}>
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
            </>
          )}
        </Card>
      </Stack>

      {showAddModal && (
        <AddServiceType
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false);
            loadCategories(1);
            loadSummary();
          }}
        />
      )}

      {editingCategoryId !== null && (
        <EditServiceType
          serviceTypeId={editingCategoryId}
          onClose={() => setEditingCategoryId(null)}
          onUpdated={() => {
            setEditingCategoryId(null);
            loadCategories();
            loadSummary();
          }}
        />
      )}
    </Box>
  );
};

export default ServiceTypeList;