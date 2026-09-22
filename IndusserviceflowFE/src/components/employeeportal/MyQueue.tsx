import { getApiErrorMessage } from "../../services/api";
import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import {
  Box,
  Card,
  Typography,
  Stack,
  Button,
  Chip,
  Avatar,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  TextField,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  SkipNext as SkipIcon,
  SwapHoriz as TransferIcon,
  PhoneForwarded as CallNextIcon,
  AccountCircle as AvatarIcon,
  EventRepeat as RescheduleIcon,
} from "@mui/icons-material";
import {
  getMyQueue,
  callNextCustomer,
  completeCustomer,
  skipCustomer,
  transferCustomer,
  rescheduleCustomer,
  getEmployeesList,
} from "../../services/employeeService";
import { getAvailableSlotsForAssignments } from "../../services/appointmentService";
import { brandGradient } from "../../theme/superAdminMuiTheme";

interface CurrentCustomer {
  appointment_id: number;
  token_number: string;
  customer_name: string;
  service_id?: number;
  service_name: string;
  appointment_status: string;
  started_at?: string;
  scheduled_time?: string;
  waited_min?: number | null;
  service_duration_minutes?: number;
}

interface WaitingCustomer {
  appointment_id: number;
  token_number: string;
  customer_name: string;
  service_id?: number;
  service_name: string;
  appointment_status: string;
  queue_position: number;
  service_duration_minutes?: number;
  scheduled_time?: string;
  overdue_min?: number;
}

interface Colleague {
  employee_id: number;
  employee_name: string;
  is_available_now?: boolean;
  currently_serving_customer?: string | null;
  shift_status?: "no_shift" | "not_started" | "on_shift" | "ended";
}

const CONTENT_KEYFRAMES = {
  "@keyframes pageFadeUp": {
    from: { opacity: 0, transform: "translateY(16px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
};

const statusLabel = (status: string) => (status === "In Progress" ? "In Service" : "Waiting");

const elapsedMinutes = (startedAt: string | undefined, nowTick: Date) => {
  if (!startedAt) return null;
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return null;
  const diffMs = nowTick.getTime() - started;
  return Math.max(0, Math.floor(diffMs / 60000));
};

const panelSx = {
  p: 3,
  borderRadius: 3,
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 1px 2px rgba(14,60,97,0.06)",
};
const REFRESH_MS = 12000;

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

export default function MyQueue() {
  const employeeId = localStorage.getItem("employee_id");
  const employeeName = localStorage.getItem("name") || "Employee";
  const orgId = localStorage.getItem("org_id") || undefined;

  const [current, setCurrent] = useState<CurrentCustomer | null>(null);
  const [waiting, setWaiting] = useState<WaitingCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "error" | "success"; message: string } | null>(null);

  const [transferTarget, setTransferTarget] = useState<number | null>(null);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [nowTick, setNowTick] = useState(new Date());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [rescheduleRow, setRescheduleRow] = useState<WaitingCustomer | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      loadQueue();
    }
    tickRef.current = setInterval(() => setNowTick(new Date()), 30000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const loadQueue = async () => {
    try {
      const response = await getMyQueue(employeeId!);
      setCurrent(response.data.data.current_customer);
      setWaiting(response.data.data.next_waiting_customers);
      setQueueError(null);
    } catch (error) {
      console.error("Failed to load employee queue:", error);
      setQueueError("Couldn't load your queue. Check your connection and try refreshing.");
    } finally {
      setLoading(false);
    }
  };

  const handleCallNext = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await callNextCustomer(employeeId!);
      await loadQueue();
    } catch (error: unknown) {
      setToast({ type: "error", message: getApiErrorMessage(error, "Could not call next customer.") });
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!current || actionLoading) return;
    setActionLoading(true);
    try {
      await completeCustomer(employeeId!, current.appointment_id);
      await loadQueue();
    } catch (error: unknown) {
      setToast({ type: "error", message: getApiErrorMessage(error, "Could not complete this customer.") });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!current || actionLoading) return;
    setActionLoading(true);
    try {
      await skipCustomer(employeeId!, current.appointment_id);
      await loadQueue();
    } catch (error: unknown) {
      setToast({ type: "error", message: getApiErrorMessage(error, "Could not skip this customer.") });
    } finally {
      setActionLoading(false);
    }
  };

  const todayStr = () => new Date().toISOString().slice(0, 10);

  const openRescheduleModal = (row: WaitingCustomer) => {
    setRescheduleRow(row);
    setSelectedSlot(null);
    setAvailableSlots([]);
    setSlotsError(null);
    setRescheduleDate(todayStr());
    setShowRescheduleModal(true);
  };

  const loadSlotsForDate = useCallback(
    async (row: WaitingCustomer, date: string) => {
      if (!date || !employeeId) return;
      setSlotsLoading(true);
      setSlotsError(null);
      setSelectedSlot(null);
      try {
        const response = await getAvailableSlotsForAssignments(orgId ?? "", date, [
          { service_id: row.service_id ?? 0, employee_id: Number(employeeId) },
        ]);
        setAvailableSlots(response.data.available_slots);
      } catch (error) {
        setSlotsError("Could not load available slots for this date.");
      } finally {
        setSlotsLoading(false);
      }
    },
    [employeeId, orgId]
  );

  useEffect(() => {
    if (showRescheduleModal && rescheduleRow && rescheduleDate) {
      loadSlotsForDate(rescheduleRow, rescheduleDate);
    }
  }, [showRescheduleModal, rescheduleDate, rescheduleRow]);

  const handleConfirmReschedule = async () => {
    if (!rescheduleRow || !selectedSlot) return;
    setRescheduleSubmitting(true);
    try {
      await rescheduleCustomer(employeeId!, rescheduleRow.appointment_id, rescheduleDate, selectedSlot);
      setShowRescheduleModal(false);
      setRescheduleRow(null);
      setToast({ type: "success", message: "Appointment rescheduled and the customer has been notified." });
      await loadQueue();
    } catch (error: unknown) {
      setToast({ type: "error", message: getApiErrorMessage(error, "Could not reschedule this appointment.") });
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  const openTransferModal = async () => {
    if (!current) return;
    try {
      const response = await getEmployeesList(orgId, { serviceId: current.service_id, availableOnly: false });
      const others: Colleague[] = response.data.data.filter(
        (emp: Colleague) => emp.employee_id !== Number(employeeId) && emp.shift_status === "on_shift"
      );
      others.sort((a, b) => Number(b.is_available_now) - Number(a.is_available_now));
      setColleagues(others);
      const firstAvailable = others.find((c) => c.is_available_now !== false);
      setTransferTarget((firstAvailable ?? others[0])?.employee_id ?? null);
      setShowTransferModal(true);
    } catch (error) {
      setToast({ type: "error", message: "Could not load colleagues to transfer to." });
    }
  };

  const [confirmBusyTransfer, setConfirmBusyTransfer] = useState(false);

  const handleTransfer = async () => {
    if (!current || !transferTarget || actionLoading) return;
    const target = colleagues.find((c) => c.employee_id === transferTarget);
    if (target && target.is_available_now === false && !confirmBusyTransfer) {
      setConfirmBusyTransfer(true);
      return;
    }
    setActionLoading(true);
    try {
      await transferCustomer(employeeId!, current.appointment_id, transferTarget);
      setShowTransferModal(false);
      setConfirmBusyTransfer(false);
      await loadQueue();
    } catch (error: unknown) {
      setToast({ type: "error", message: getApiErrorMessage(error, "Could not transfer this customer.") });
    } finally {
      setActionLoading(false);
    }
  };
  const currentElapsed = current ? elapsedMinutes(current.started_at, nowTick) : null;

  const selectedTarget = colleagues.find((c) => c.employee_id === transferTarget);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5, ...CONTENT_KEYFRAMES, animation: "pageFadeUp 0.45s cubic-bezier(0.22,1,0.36,1) forwards" }}>
      <Stack spacing={3}>
        {queueError && (
          <Alert severity="error" action={<Button color="inherit" size="small" onClick={loadQueue}>Retry</Button>}>
            {queueError}
          </Alert>
        )}

        <Box>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
            My Queue
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Customers assigned to Customer Officer Queue — {employeeName}.
          </Typography>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "0.9fr 1.4fr" }, gap: 2.5, alignItems: "start" }}>
          <Card elevation={0} sx={panelSx}>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.06em", fontWeight: 700 }}>
              Current Customer
            </Typography>

            {current ? (
              <>
                <Box sx={{ display: "flex", flexDirection: "row", gap: 2, alignItems: "center", mt: 2, mb: 3 }}>
                  <Avatar sx={{ width: 52, height: 52, backgroundImage: brandGradient }}>
                    <AvatarIcon />
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
                      {current.customer_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {current.service_name} • {statusLabel(current.appointment_status)}
                      {currentElapsed !== null && ` • Serving for ${currentElapsed} min`}
                    </Typography>
                    {typeof current.waited_min === "number" && (
                      <Typography variant="caption" color={current.waited_min > 0 ? "warning.main" : "text.secondary"}>
                        {current.waited_min > 0
                          ? `Waited ${current.waited_min} min before being called`
                          : "Called on time"}
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* 2x2 button grid: Complete/Skip on top row, Transfer/Call Next on bottom row */}
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                  <Button variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={handleComplete} disabled={actionLoading}>
                    Complete
                  </Button>
                  <Button variant="outlined" startIcon={<SkipIcon />} onClick={handleSkip} disabled={actionLoading}>
                    Skip
                  </Button>
                  <Button variant="outlined" startIcon={<TransferIcon />} onClick={openTransferModal} disabled={actionLoading}>
                    Transfer
                  </Button>
                  <Button variant="contained" startIcon={<CallNextIcon />} onClick={handleCallNext} disabled={actionLoading}>
                    Call Next
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
                  Not serving anyone yet — call the next customer to start.
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<CallNextIcon />}
                  onClick={handleCallNext}
                  disabled={actionLoading || waiting.length === 0}
                >
                  Call Next
                </Button>
              </>
            )}
          </Card>

          <Card elevation={0} sx={panelSx}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700 }}>
              Queue List ({waiting.length + (current ? 1 : 0)})
            </Typography>

            <TableContainer sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Service</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Position</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Waited So Far</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {current && (
                    <TableRow hover>
                      <TableCell>{current.customer_name}</TableCell>
                      <TableCell>{current.service_name}</TableCell>
                      <TableCell>Now Serving</TableCell>
                      <TableCell>
                        {typeof current.waited_min === "number" ? `${current.waited_min} min` : "—"}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label="In Service" color="info" variant="filled" sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}

                  {waiting.map((row) => (
                    <TableRow hover key={row.appointment_id}>
                      <TableCell>{row.customer_name}</TableCell>
                      <TableCell>{row.service_name}</TableCell>
                      <TableCell>#{row.queue_position}</TableCell>
                      <TableCell
                        sx={(row.overdue_min ?? 0) > 0 ? { color: "warning.main", fontWeight: 600 } : undefined}
                      >
                        {row.overdue_min ?? 0} min
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label="Waiting" color="warning" variant="outlined" sx={{ fontWeight: 600 }} />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Reschedule">
                          <span>
                            <IconButton size="small" onClick={() => openRescheduleModal(row)}>
                              <RescheduleIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!current && waiting.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ color: "text.secondary", py: 4 }}>
                        No customers in your queue right now.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      </Stack>

      <Dialog
        open={showTransferModal}
        onClose={() => {
          setShowTransferModal(false);
          setConfirmBusyTransfer(false);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Transfer {current?.customer_name}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Only colleagues who handle {current?.service_name} are shown. Busy colleagues are marked and can still be
            selected if needed.
          </DialogContentText>

          <Select
            fullWidth
            size="small"
            value={transferTarget ?? ""}
            onChange={(e) => {
              setTransferTarget(Number(e.target.value));
              setConfirmBusyTransfer(false);
            }}
            displayEmpty
          >
            {colleagues.length === 0 && (
              <MenuItem value="" disabled>
                No colleagues available for this service
              </MenuItem>
            )}
            {colleagues.map((emp) => (
              <MenuItem key={emp.employee_id} value={emp.employee_id}>
                {emp.employee_name}
                {emp.is_available_now === false ? " (busy)" : ""}
              </MenuItem>
            ))}
          </Select>

          {confirmBusyTransfer && selectedTarget && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {selectedTarget.employee_name} is currently busy
              {selectedTarget.currently_serving_customer ? ` with ${selectedTarget.currently_serving_customer}` : ""}.
              Click Transfer again to proceed anyway.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => {
              setShowTransferModal(false);
              setConfirmBusyTransfer(false);
            }}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleTransfer} disabled={actionLoading || !transferTarget}>
            Transfer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Reschedule {rescheduleRow?.customer_name}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Pick a new date and time for {rescheduleRow?.service_name}. Only slots where you're free are shown.
          </DialogContentText>

          <TextField
            label="Date"
            type="date"
            size="small"
            fullWidth
            value={rescheduleDate}
            onChange={(e) => setRescheduleDate(e.target.value)}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: { min: todayStr() },
            }}
            sx={{ mb: 2 }}
          />

          {slotsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={22} />
            </Box>
          ) : slotsError ? (
            <Alert severity="error">{slotsError}</Alert>
          ) : availableSlots.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No available slots on this date. Try another date.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {availableSlots.map((slot) => (
                <Chip
                  key={slot}
                  label={slot}
                  clickable
                  color={selectedSlot === slot ? "primary" : "default"}
                  variant={selectedSlot === slot ? "filled" : "outlined"}
                  onClick={() => setSelectedSlot(slot)}
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setShowRescheduleModal(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmReschedule}
            disabled={!selectedSlot || rescheduleSubmitting}
          >
            {rescheduleSubmitting ? <CircularProgress size={18} color="inherit" /> : "Reschedule"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert onClose={() => setToast(null)} severity={toast?.type ?? "error"} variant="filled" sx={{ fontWeight: 500 }}>
          {toast?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}