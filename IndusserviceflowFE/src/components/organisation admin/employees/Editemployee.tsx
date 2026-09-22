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
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Divider,
  Button,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { getEmployeeById, getAllShifts, unwrapList, updateEmployee } from "../../../services/employeeService";
import type { Shift } from "../../../services/employeeService";
import {
  createEmployeeServiceLink,
  getEmployeeServiceLinksForEmployee,
  getOrgServices,
  updateEmployeeServiceLink,
} from "../../../services/catalogService";
import type { CatalogService, EmployeeServiceLink } from "../../../services/catalogService";
import { getNameError, getMobileError, getEmailError, getDesignationError } from "../../../utils/validators";
import { getApiErrorMessage } from "../../../services/api";

const STATUS_OPTIONS: Array<{ value: "Active" | "Inactive"; label: string; color: "success" | "error" }> = [
  { value: "Active", label: "Active", color: "success" },
  { value: "Inactive", label: "Inactive", color: "error" },
];

type Props = {
  employeeId: number;
  onClose: () => void;
  onUpdated: () => void;
};

const EditEmployee = ({ employeeId, onClose, onUpdated }: Props) => {
  const orgId = localStorage.getItem("org_id") || undefined;

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [existingLinks, setExistingLinks] = useState<EmployeeServiceLink[]>([]);
  const [employeeName, setEmployeeName] = useState("");
  const [designation, setDesignation] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [shift, setShift] = useState("");
  const [status, setStatus] = useState<"Active" | "On Hold" | "Inactive">("Active");
  const [serviceIds, setServiceIds] = useState<Set<number>>(new Set());
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    Promise.all([
      getEmployeeById(employeeId),
      getAllShifts(orgId),
      getOrgServices(orgId),
      getEmployeeServiceLinksForEmployee(employeeId),
    ])
      .then(([empRes, shiftRes, serviceRes, linkRes]) => {
        const emp = empRes.data;
        setEmployeeName(emp.employee_name);
        setDesignation(emp.designation);
        setMobile(emp.mobile);
        setEmail(emp.email);
        setShift(emp.shift ? String(emp.shift) : "");
        setStatus(emp.status);
        setShifts(unwrapList(shiftRes.data));
        setServices(Array.isArray(serviceRes.data) ? serviceRes.data : []);

        const links = Array.isArray(linkRes.data) ? linkRes.data : [];
        setExistingLinks(links);
        setServiceIds(new Set(links.filter((l) => l.status === "Active").map((l) => l.service)));
      })
      .catch(() => setError("Couldn't load this employee."))
      .finally(() => setLoading(false));
  }, [employeeId, orgId]);

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
    if (!validate()) return;

    setSaving(true);
    setError(null);
    try {
      await updateEmployee(employeeId, {
        employee_name: employeeName.trim(),
        designation: designation.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        shift: shift ? Number(shift) : null,
        status,
      });

      const linkByService = new Map(existingLinks.map((l) => [l.service, l]));
      const linkSyncs: Promise<unknown>[] = [];

      services.forEach((s) => {
        const existingLink = linkByService.get(s.service_id);
        const isChecked = serviceIds.has(s.service_id);

        if (isChecked && !existingLink) {
          linkSyncs.push(createEmployeeServiceLink(employeeId, s.service_id));
        } else if (isChecked && existingLink && existingLink.status !== "Active") {
          linkSyncs.push(updateEmployeeServiceLink(existingLink.employee_service_id, { status: "Active" }));
        } else if (!isChecked && existingLink && existingLink.status === "Active") {
          linkSyncs.push(updateEmployeeServiceLink(existingLink.employee_service_id, { status: "Inactive" }));
        }
      });

      await Promise.allSettled(linkSyncs);
      onUpdated();
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Couldn't save changes. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth scroll="paper" slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, pt: 3, pb: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Edit employee
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Update staff details, shift, or status.
          </Typography>
        </Box>
        <IconButton onClick={onClose} aria-label="Close" size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {loading ? (
        <DialogContent sx={{ px: 3, py: 6, textAlign: "center" }}>
          <Typography color="text.secondary">Loading employee...</Typography>
        </DialogContent>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent dividers sx={{ px: 3 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2.5 }}>
                {error}
              </Alert>
            )}

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
              Staff details
            </Typography>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                label="Full name"
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
              <TextField fullWidth select label="Shift" value={shift} onChange={(e) => setShift(e.target.value)}>
                <MenuItem value="">Unassigned</MenuItem>
                {shifts.map((s) => (
                  <MenuItem key={s.shift_id} value={String(s.shift_id)}>
                    {s.shift_name}
                  </MenuItem>
                ))}
              </TextField>

              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                  Status
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={status === "On Hold" ? null : status}
                  onChange={(_e, v) => v && setStatus(v)}
                  sx={{ width: "100%" }}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <ToggleButton
                      key={opt.value}
                      value={opt.value}
                      sx={{
                        flex: 1,
                        textTransform: "none",
                        fontWeight: 600,
                        "&.Mui-selected": {
                          bgcolor: `${opt.color}.light`,
                          color: `${opt.color}.dark`,
                          "&:hover": { bgcolor: `${opt.color}.light` },
                        },
                      }}
                    >
                      {opt.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
                {status === "On Hold" && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.75 }}>
                    Currently on hold. Choosing Active or Inactive here will end the hold. To
                    reactivate without changing anything else, use "Reactivate" from the Actions
                    menu instead.
                  </Typography>
                )}
              </Box>
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Services this employee can perform
            </Typography>
            {services.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No active services in this organization yet.
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
          </DialogContent>

          <Divider />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, p: 2.5 }}>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </Box>
        </Box>
      )}
    </Dialog>
  );
};

export default EditEmployee;