import React, { useEffect, useRef, useState } from "react";
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
  Paper,
  Avatar,
  Chip,
  Select,
  alpha,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Restore as RestoreIcon,
  Download as DownloadIcon,
  Groups as UsersIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as PendingIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { useSearchParams } from "react-router-dom";

import { getUsers, exportUsers } from "../../../services/api";
import Toast from "../../common/Toast";
import type { ToastType } from "../../common/Toast";
import ExportMenu from "../../common/ExportMenu";

interface OrgAdmin {
  id: number;
  name: string;
  username: string;
  email: string;
  mobile: string;
  organization: string | null;
  status: string; // "Active" | "Pending" | "Inactive" | "Rejected"
  role: string;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const statusLabel = (value: "all" | "active" | "pending" | "rejected") =>
  value === "all"
    ? "All statuses"
    : value === "active"
    ? "Active"
    : value === "pending"
    ? "Pending"
    : "Rejected";

const SUMMARY_COLORS = {
  total: "#0F766E",
  active: "#16A34A",
  pending: "#D97706",
  rejected: "#DC2626",
};

const UsersList: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [users, setUsers] = useState<OrgAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null,
  );
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "pending" | "rejected">("all");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [count, setCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [summary, setSummary] = useState({ total: 0, active: 0, pending: 0, rejected: 0 });

  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await getUsers({ page_size: 1 });
      const s = res?.summary ?? {};
      setSummary({
        total: s.total ?? res?.count ?? 0,
        active: s.active ?? 0,
        pending: s.pending ?? 0,
        rejected: s.rejected ?? s.inactive ?? 0,
      });
    } catch (err) {
      console.error("Failed to load summary counts:", err);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchUsers();
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, statusFilter, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, any> = { page, page_size: pageSize };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await getUsers(params);
      setUsers(response?.data ?? []);
      setCount(response?.count ?? 0);
      setTotalPages(response?.total_pages ?? 1);
      if (response?.summary) {
        const s = response.summary;
        setSummary({
          total: s.total ?? 0,
          active: s.active ?? 0,
          pending: s.pending ?? 0,
          rejected: s.rejected ?? s.inactive ?? 0,
        });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load organization admins. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      setExportAnchor(null);

      const params: Record<string, any> = {};
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== "all") params.status = statusFilter;

      const blobData = await exportUsers(format, params);

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
      link.download = `organization-admins.${format === "excel" ? "xlsx" : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      setToast({
        type: "error",
        message: "Unable to export admins. Check the console for details.",
      });
    }
  };

  const initials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const rangeStart = count === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, count);

  const summaryTiles = [
    { label: "Total admins", value: summary.total, color: SUMMARY_COLORS.total, icon: <UsersIcon fontSize="small" /> },
    { label: "Active", value: summary.active, color: SUMMARY_COLORS.active, icon: <CheckCircleIcon fontSize="small" /> },
    { label: "Pending", value: summary.pending, color: SUMMARY_COLORS.pending, icon: <PendingIcon fontSize="small" /> },
    { label: "Rejected", value: summary.rejected, color: SUMMARY_COLORS.rejected, icon: <CancelIcon fontSize="small" /> },
  ];

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5 }}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
          Organization Admins
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage organization administrator accounts.
        </Typography>
      </Box>

      {/* Summary */}
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

      {/* Toolbar + Table */}
      <Card
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          bgcolor: "background.paper",
          boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, justifyContent: "space-between", mb: 2.5 }}>
          <TextField
            size="small"
            placeholder="Search admins..."
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

          <Box sx={{ display: "flex", gap: 1.5 }}>
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
              <MenuItem onClick={() => { setStatusFilter("all"); setStatusAnchor(null); }}>All</MenuItem>
              <MenuItem onClick={() => { setStatusFilter("active"); setStatusAnchor(null); }}>Active</MenuItem>
              <MenuItem onClick={() => { setStatusFilter("pending"); setStatusAnchor(null); }}>Pending</MenuItem>
              <MenuItem onClick={() => { setStatusFilter("rejected"); setStatusAnchor(null); }}>Rejected</MenuItem>
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

        {loading ? (
          <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
            Loading organization admins...
          </Typography>
        ) : error ? (
          <Typography color="error" sx={{ py: 6, textAlign: "center" }}>
            {error}
          </Typography>
        ) : users.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <UsersIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
              No admins found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your search or filters.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ "& th": { fontWeight: 700, color: "text.secondary", bgcolor: "background.default" } }}>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Mobile</TableCell>
                    <TableCell>Organization</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => {
                    const statusLower = (user.status || "").toLowerCase();
                    const isActive = statusLower === "active";
                    const isRejected = statusLower === "rejected";
                    const chipColor: "success" | "error" | "warning" | "default" = isActive
                      ? "success"
                      : isRejected
                      ? "error"
                      : statusLower === "pending"
                      ? "warning"
                      : "default";
                    return (
                      <TableRow key={user.id} hover>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Avatar sx={{ bgcolor: "primary.light", color: "primary.dark", fontWeight: 700, fontSize: 13 }}>
                              {initials(user.name)}
                            </Avatar>
                            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                              {user.name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.mobile}</TableCell>
                        <TableCell>
                          {user.organization ? (
                            user.organization
                          ) : (
                            <Typography component="span" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={user.status || "—"}
                            color={chipColor}
                            sx={{ fontWeight: 600 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", justifyContent: "space-between", mt: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {rangeStart}-{rangeEnd} of {count}
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
                <Button size="small" disabled={page === 1} onClick={() => setPage(1)} sx={{ minWidth: 36, px: 1 }}>
                  <FirstPageIcon fontSize="small" />
                </Button>
                <Button size="small" disabled={page === 1} onClick={() => setPage((p) => p - 1)} sx={{ minWidth: 36, px: 1 }}>
                  <ChevronLeftIcon fontSize="small" />
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ px: 1 }}>
                  Page {page} of {totalPages}
                </Typography>
                <Button size="small" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} sx={{ minWidth: 36, px: 1 }}>
                  <ChevronRightIcon fontSize="small" />
                </Button>
                <Button size="small" disabled={page === totalPages} onClick={() => setPage(totalPages)} sx={{ minWidth: 36, px: 1 }}>
                  <LastPageIcon fontSize="small" />
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Card>
    </Box>
  );
};

export default UsersList;