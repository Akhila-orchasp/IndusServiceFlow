import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Card,
  Typography,
  Stack,
  Button,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Pagination,
} from "@mui/material";
import {
  Add as AddIcon,
  Schedule as ScheduleIcon,
  FreeBreakfast as BreakIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import {
  getShifts,
  deleteShift,
  unwrapList,
  type Shift,
  type Pagination as PaginationMeta,
} from "../../../services/employeeService";
import { useConfirm } from "../../common/ConfirmDialog";
import ShiftForm from "./ShiftForm";

type ShiftRow = Shift & { status?: "Active" | "Inactive" };

const PAGE_SIZE = 9;

const panelSx = {
  p: 3,
  borderRadius: 3,
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 1px 2px rgba(14,60,97,0.06)",
};

const toTimeLabel = (t?: string | null) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
};

const ShiftsPage = () => {
  const confirm = useConfirm();
  const orgId = localStorage.getItem("org_id") || undefined;

  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRow | null>(null);

  const load = useCallback(
    (targetPage = page) => {
      setLoading(true);
      setError(null);
      getShifts(orgId, PAGE_SIZE, targetPage)
        .then((res) => {
          setShifts(unwrapList(res.data));
          const data = res.data as { pagination?: PaginationMeta };
          setPagination(data.pagination ?? null);
          if (targetPage !== page) setPage(targetPage);
        })
        .catch(() => setError("Couldn't load shifts. Please try again."))
        .finally(() => setLoading(false));
    },
    [orgId, page]
  );
  useEffect(() => {
    const timer = setTimeout(() => load(), 0);
    return () => clearTimeout(timer);
  }, [load]);


  useEffect(() => {
    if (!loading && shifts.length === 0 && page > 1) {
      setPage((p) => p - 1);
    }
  }, [loading, shifts.length, page]);

  const handleDelete = async (shift: ShiftRow) => {
    const ok = await confirm({
      title: "Delete shift?",
      message: (
        <>
          Delete <strong>"{shift.shift_name}"</strong>? Employees currently on this shift will be
          left without one. This cannot be undone.
        </>
      ),
      variant: "danger",
      confirmText: "Delete",
    });
    if (!ok) return;

    setBusyId(shift.shift_id);
    try {
      await deleteShift(shift.shift_id);
      load();
    } catch {
      setError("Couldn't delete this shift.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5 }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Shifts
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Define working hours and breaks. Appointment booking never offers slots that fall
              inside a shift's break window.
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => {
              setEditingShift(null);
              setShowForm(true);
            }}
          >
            Add shift
          </Button>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}

        <Card elevation={0} sx={panelSx}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={26} />
            </Box>
          ) : shifts.length === 0 ? (
            <Box sx={{ textAlign: "center", color: "text.secondary", py: 5 }}>
              No shifts yet. Create one to start assigning employees.
            </Box>
          ) : (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: 2 }}>
              {shifts.map((shift) => (
                <Card
                  key={shift.shift_id}
                  elevation={0}
                  sx={{ ...panelSx, p: 2.25, display: "flex", flexDirection: "column", gap: 1.25 }}
                >
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: "rgba(14,165,233,0.12)",
                          color: "primary.main",
                          flexShrink: 0,
                        }}
                      >
                        <ScheduleIcon fontSize="small" />
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                        {shift.shift_name}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton
                        size="small"
                        title="Edit"
                        onClick={() => {
                          setEditingShift(shift);
                          setShowForm(true);
                        }}
                        sx={{ color: "primary.main" }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        title="Delete"
                        disabled={busyId === shift.shift_id}
                        onClick={() => handleDelete(shift)}
                        sx={{ color: "error.main" }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    {toTimeLabel(shift.start_time)} - {toTimeLabel(shift.end_time)}
                  </Typography>

                  {shift.break_start && shift.break_end ? (
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
                      <BreakIcon sx={{ fontSize: 16, color: "warning.dark" }} />
                      <Typography variant="caption" sx={{ color: "warning.dark", fontWeight: 600 }}>
                        Break {toTimeLabel(shift.break_start)} - {toTimeLabel(shift.break_end)}
                      </Typography>
                    </Stack>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      No break configured
                    </Typography>
                  )}

                  <Chip
                    size="small"
                    label={shift.status || "Active"}
                    color={shift.status === "Inactive" ? "error" : "success"}
                    variant={shift.status === "Inactive" ? "outlined" : "filled"}
                    sx={{ fontWeight: 600, alignSelf: "flex-start", mt: "auto" }}
                  />
                </Card>
              ))}
            </Box>
          )}

          {pagination && pagination.total_pages > 1 && (
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", alignItems: "center", pt: 3 }}
              spacing={2}
            >
              <Typography variant="caption" color="text.secondary">
                {pagination.total_records} shift{pagination.total_records === 1 ? "" : "s"} total
              </Typography>
              <Pagination
                count={pagination.total_pages}
                page={pagination.current_page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                size="small"
                disabled={loading}
              />
            </Stack>
          )}
        </Card>
      </Stack>

      {showForm && (
        <ShiftForm
          shift={editingShift || undefined}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            const wasNewShift = !editingShift;
            setShowForm(false);

            if (!wasNewShift) {
              load();
              return;
            }

            getShifts(orgId, PAGE_SIZE, 1)
              .then((res) => {
                const data = res.data as { pagination?: PaginationMeta };
                const lastPage = data.pagination?.total_pages || 1;
                load(lastPage);
              })
              .catch(() => load());
          }}
        />
      )}
    </Box>
  );
};

export default ShiftsPage;