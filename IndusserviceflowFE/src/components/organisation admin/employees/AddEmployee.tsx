import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  TextField,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Alert,
  Divider,
  Button,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { createEmployee, getAllShifts, unwrapList } from "../../../services/employeeService";
import type { Shift } from "../../../services/employeeService";
import { createEmployeeServiceLink, getOrgServices } from "../../../services/catalogService";
import { getApiErrorMessage } from "../../../services/api";
import type { CatalogService } from "../../../services/catalogService";
import { getNameError, getMobileError, getEmailError, getDesignationError } from "../../../utils/validators";
import usePlanAccess from "../../../hooks/usePlanAccess";

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

const AddEmployee = ({ onClose, onCreated }: Props) => {
  const orgId = localStorage.getItem("org_id") || undefined;
  const { canAddEmployee, blockedReason } = usePlanAccess();
  const limitMessage = !canAddEmployee ? blockedReason("employee") : null;

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [employeeName, setEmployeeName] = useState("");
  const [designation, setDesignation] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [shift, setShift] = useState("");
  const status = "Active" as const;
  const [serviceIds, setServiceIds] = useState<Set<number>>(new Set());
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldErrors = useMemo(() => {
    const next: Record<string, string> = {};
    const employeeNameError = getNameError(employeeName, "Employee name");
    if (employeeNameError) next.employeeName = employeeNameError;

    const designationError = getDesignationError(designation);
    if (designationError) next.designation = designationError;

    const mobileError = getMobileError(mobile);
    if (mobileError) next.mobile = mobileError;

    const emailError = getEmailError(email);
    if (emailError) next.email = emailError;

    return next;
  }, [employeeName, designation, mobile, email]);

  const errors: Record<string, string | undefined> = {
    employeeName: touched.employeeName ? fieldErrors.employeeName : undefined,
    designation: touched.designation ? fieldErrors.designation : undefined,
    mobile: touched.mobile ? fieldErrors.mobile : undefined,
    email: touched.email ? fieldErrors.email : undefined,
  };

  const markTouched = (field: string) => setTouched((t) => ({ ...t, [field]: true }));

  useEffect(() => {
    getAllShifts(orgId)
      .then((res) => setShifts(unwrapList(res.data)))
      .catch(() => setShifts([]));
    getOrgServices(orgId)
      .then((res) => setServices(Array.isArray(res.data) ? res.data : []))
      .catch(() => setServices([]));
  }, [orgId]);

  const toggleService = (serviceId: number) => {
    setServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const validate = () => {
    setTouched({ employeeName: true, designation: true, mobile: true, email: true });
    return Object.keys(fieldErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (limitMessage) return;
    if (!validate()) return;

    setSaving(true);
    setError(null);
    try {
      const res = await createEmployee({
        org_id: orgId,
        employee_name: employeeName.trim(),
        designation: designation.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        shift: shift ? Number(shift) : null,
        status,
      });

      const employeeId = (res.data as any)?.employee_id;

      if (employeeId && serviceIds.size > 0) {
        await Promise.allSettled(
          Array.from(serviceIds).map((sid) => createEmployeeServiceLink(employeeId, sid))
        );
      }

      onCreated();
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Couldn't create the employee. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth scroll="paper" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, pt: 3, pb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Add employee
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add a new staff member to your organization.
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close" size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ px: 3 }}>
          {limitMessage && (
            <Alert severity="warning" sx={{ mb: 2.5 }}>
              {limitMessage}
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2.5 }}>
              {error}
            </Alert>
          )}

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
            Staff details
          </Typography>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 2.5 }}>
            <TextField
              fullWidth
              label="Full name"
              placeholder="e.g. Aishwarya Menon"
              value={employeeName}
              onChange={(e) => {
                setEmployeeName(e.target.value);
                markTouched("employeeName");
              }}
              onBlur={() => markTouched("employeeName")}
              error={!!errors.employeeName}
              helperText={errors.employeeName}
              autoComplete="name"
            />
            <TextField
              fullWidth
              label="Designation"
              placeholder="e.g. Nurse, Cashier"
              value={designation}
              onChange={(e) => {
                setDesignation(e.target.value);
                markTouched("designation");
              }}
              onBlur={() => markTouched("designation")}
              error={!!errors.designation}
              helperText={errors.designation}
            />
            <TextField
              fullWidth
              label="Mobile"
              placeholder="98xxxxxxxx"
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value);
                markTouched("mobile");
              }}
              onBlur={() => markTouched("mobile")}
              error={!!errors.mobile}
              helperText={errors.mobile}
              slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 10 } }}
              autoComplete="tel"
            />
            <TextField
              fullWidth
              type="email"
              label="Email"
              placeholder="name@company.in"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                markTouched("email");
              }}
              onBlur={() => markTouched("email")}
              error={!!errors.email}
              helperText={errors.email}
              autoComplete="email"
            />
            <TextField
              fullWidth
              select
              label="Shift"
              value={shift}
              onChange={(e) => setShift(e.target.value)}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {shifts.map((s) => (
                <MenuItem key={s.shift_id} value={String(s.shift_id)}>
                  {s.shift_name}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Services this employee can perform
          </Typography>
          {services.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No active services yet. You can assign services to this employee later from the Edit Employee page once services have been added.
            </Typography>
          ) : (
            <FormGroup sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 3, rowGap: 0.5 }}>
              {services.map((s) => (
                <FormControlLabel
                  key={s.service_id}
                  control={<Checkbox checked={serviceIds.has(s.service_id)} onChange={() => toggleService(s.service_id)} />}
                  label={<Typography variant="body2">{s.service_name}</Typography>}
                />
              ))}
            </FormGroup>
          )}

          <Alert severity="info" variant="outlined" sx={{ mt: 2.5 }}>
            Login credentials will be generated automatically and sent to this employee's email.
          </Alert>
        </DialogContent>

        <Divider />
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, p: 2.5 }}>
          <Button type="submit" variant="contained" disabled={saving || !!limitMessage}>
            {saving ? "Adding..." : "Save"}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default AddEmployee;