import { useEffect, useState } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  TextField,
  Button,
  Alert,
  Stack,
  Typography,
  Divider,
  FormControlLabel,
  Switch,
} from "@mui/material";
import { Close as CloseIcon, Schedule as ScheduleIcon } from "@mui/icons-material";
import { createShift, updateShift, getAllShifts, unwrapList, type Shift } from "../../../services/employeeService";
import { brandGradient } from "../../../theme/superAdminMuiTheme";
import { getApiErrorMessage } from "../../../services/api";
import {
  validateShiftName,
  validateShiftTimes,
  validateShiftBreak,
  timeToMinutes,
  isOvernightWindow,
  effectiveEndMinutes,
} from "../../../utils/validators";

type Props = {
  shift?: Shift & { status?: "Active" | "Inactive" };
  onClose: () => void;
  onSaved: () => void;
};

type TouchedState = { [field: string]: boolean };

const ShiftForm = ({ shift, onClose, onSaved }: Props) => {
  const isEdit = Boolean(shift);

  const [shiftName, setShiftName] = useState(shift?.shift_name || "");
  const [startTime, setStartTime] = useState(shift?.start_time?.slice(0, 5) || "09:00");
  const [endTime, setEndTime] = useState(shift?.end_time?.slice(0, 5) || "18:00");
  const [hasBreak, setHasBreak] = useState(Boolean(shift?.break_start && shift?.break_end));
  const [breakStart, setBreakStart] = useState(shift?.break_start?.slice(0, 5) || "13:00");
  const [breakEnd, setBreakEnd] = useState(shift?.break_end?.slice(0, 5) || "13:30");
  const [status, setStatus] = useState<"Active" | "Inactive">(shift?.status || "Active");

  const [touched, setTouched] = useState<TouchedState>({});
  const [dirty, setDirty] = useState<TouchedState>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Every shift this org can see — its own shifts plus any default
  // (category-based) or global template shift it inherits, mirroring
  // the backend's visibility rules. Used to block picking a start/end
  // time that already belongs to one of them, org-owned or not.
  const [visibleShifts, setVisibleShifts] = useState<Shift[]>([]);
  useEffect(() => {
    const orgId = localStorage.getItem("org_id") || undefined;
    getAllShifts(orgId)
      .then((res) => setVisibleShifts(unwrapList(res.data)))
      .catch(() => setVisibleShifts([]));
  }, []);

  const markTouched = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
  const markDirty = (field: string) => setDirty((d) => ({ ...d, [field]: true }));
  const touchAll = (fields: string[]) =>
    fields.reduce((acc, field) => ({ ...acc, [field]: true }), {} as TouchedState);

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const isOvernight = isOvernightWindow(startMin, endMin);
  const effectiveEndMin = effectiveEndMinutes(startMin, endMin);

  const nameErrorMsg = validateShiftName(shiftName);
  const timesErrorMsg = validateShiftTimes(startTime, endTime);
  const breakErrorMsg = validateShiftBreak(hasBreak, breakStart, breakEnd, startTime, endTime);

  // A shift with the exact same start/end already visible to this org
  // (whether it's one of the org's own shifts or a default/category-based
  // one it merely inherits) is a duplicate, no matter what it's named.
  const duplicateShift = visibleShifts.find(
    (s) =>
      s.shift_id !== shift?.shift_id &&
      (s.start_time?.slice(0, 5) || "") === startTime &&
      (s.end_time?.slice(0, 5) || "") === endTime
  );
  const duplicateErrorMsg = duplicateShift
    ? `A shift with these start and end times already exists ("${duplicateShift.shift_name}").`
    : "";

  const nameValid = !nameErrorMsg;
  const timesValid = !timesErrorMsg && !duplicateErrorMsg;
  const breakValid = !breakErrorMsg;

  const formValid = nameValid && timesValid && breakValid;

  const nameError = touched.shiftName && (dirty.shiftName || submitAttempted) ? nameErrorMsg : "";
  const timesError =
    touched.endTime && (dirty.endTime || submitAttempted) ? timesErrorMsg || duplicateErrorMsg : "";
  const breakError =
    touched.breakEnd && (dirty.breakEnd || submitAttempted) && hasBreak ? breakErrorMsg : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setTouched(touchAll(["shiftName", "endTime", "breakEnd"]));
    if (!formValid) return;

    const durationHours =
      startMin !== null && effectiveEndMin !== null
        ? Math.round(((effectiveEndMin - startMin) / 60) * 10) / 10
        : 8;

    const payload = {
      shift_name: shiftName.trim(),
      start_time: startTime,
      end_time: endTime,
      break_start: hasBreak ? breakStart : null,
      break_end: hasBreak ? breakEnd : null,
      status,
      duration_hours: durationHours,
    };

    setSaving(true);
    setError(null);
    try {
      if (isEdit && shift) {
        await updateShift(shift.shift_id, payload);
      } else {
        await createShift(payload);
      }
      onSaved();
    } catch (error: unknown) {
      setError(
        getApiErrorMessage(
          error,
          `Couldn't ${isEdit ? "update" : "create"} this shift. Please try again.`
        )
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <Box sx={{ px: 3, pt: 3, pb: 2, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundImage: brandGradient,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            <ScheduleIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.2, fontWeight: 700 }}>
              {isEdit ? "Edit Shift" : "New Shift"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Set working hours and an optional break
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ flexShrink: 0 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Divider />

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2.5 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2.5}>
            <TextField
              id="shiftName"
              label="Shift Name"
              placeholder="e.g. Morning Shift"
              value={shiftName}
              onChange={(e) => {
                setShiftName(e.target.value);
                markDirty("shiftName");
              }}
              onBlur={() => markTouched("shiftName")}
              error={!!nameError}
              helperText={nameError}
              fullWidth
            />

            <Stack direction="row" spacing={2}>
              <TextField
                id="startTime"
                label="Start Time"
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  markDirty("endTime");
                  markTouched("endTime");
                }}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                id="endTime"
                label="End Time"
                type="time"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  markDirty("endTime");
                }}
                onBlur={() => markTouched("endTime")}
                error={!!timesError}
                helperText={timesError}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>

            {isOvernight && (
              <Typography variant="caption" color="text.secondary">
                This shift runs overnight, ending at {endTime} the next day.
              </Typography>
            )}

            <Divider />

            <FormControlLabel
              control={<Switch checked={hasBreak} onChange={(e) => setHasBreak(e.target.checked)} />}
              label="Employees on this shift take a break"
            />

            {hasBreak && (
              <>
                <Stack direction="row" spacing={2}>
                  <TextField
                    id="breakStart"
                    label="Break Start"
                    type="time"
                    value={breakStart}
                    onChange={(e) => setBreakStart(e.target.value)}
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    id="breakEnd"
                    label="Break End"
                    type="time"
                    value={breakEnd}
                    onChange={(e) => {
                      setBreakEnd(e.target.value);
                      markDirty("breakEnd");
                    }}
                    onBlur={() => markTouched("breakEnd")}
                    error={!!breakError}
                    helperText={breakError}
                    fullWidth
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Customers won't be able to book appointments that overlap this window.
                </Typography>
              </>
            )}

            {isEdit && (
              <>
                <Divider />
                <FormControlLabel
                  control={
                    <Switch
                      checked={status === "Active"}
                      onChange={(e) => setStatus(e.target.checked ? "Active" : "Inactive")}
                    />
                  }
                  label={`Shift is ${status === "Active" ? "Active" : "Inactive"}`}
                />
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button type="submit" variant="contained" disabled={saving || !formValid}>
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Shift"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default ShiftForm;