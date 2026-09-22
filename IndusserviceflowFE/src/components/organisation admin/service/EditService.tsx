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
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from "@mui/material";
import { Close as CloseIcon, MiscellaneousServices as ServiceIcon } from "@mui/icons-material";
import { getServiceById, getServiceTypes, updateService } from "../../../services/catalogService";
import type { ServiceType } from "../../../services/catalogService";
import { brandGradient } from "../../../theme/superAdminMuiTheme";
import { getApiErrorMessage } from "../../../services/api";

const isRequired = (value: string) => value.trim() !== "";

const isNonNegativeNumber = (value: string) => {
  const num = Number(value);
  return value.trim() !== "" && !Number.isNaN(num) && num >= 0;
};

const touchAll = (fields: string[]) => fields.reduce<Record<string, boolean>>((acc, field) => {
  acc[field] = true;
  return acc;
}, {});

const isPositiveNumber = (value: string) => {
  const num = Number(value);
  return value.trim() !== "" && !Number.isNaN(num) && num > 0;
};

type Props = {
  serviceId: number;
  onClose: () => void;
  onUpdated: () => void;
};

const EditService = ({ serviceId, onClose, onUpdated }: Props) => {
  const orgId = localStorage.getItem("org_id") || undefined;

  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [serviceType, setServiceType] = useState<string>("");
  const [duration, setDuration] = useState("");
  const [fee, setFee] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameValid = isRequired(serviceName);
  const typeValid = isRequired(serviceType);
  const durationValid = isPositiveNumber(duration);
  const feeValid = isNonNegativeNumber(fee);
  const formValid = nameValid && typeValid && durationValid && feeValid;

  const errors: Record<string, string> = {
    serviceName: touched.serviceName && !nameValid ? "Service name is required." : "",
    serviceType: touched.serviceType && !typeValid ? "Please select a service type." : "",
    duration: touched.duration && !durationValid ? "Enter a valid duration in minutes." : "",
    fee: touched.fee && !feeValid ? "Enter a valid fee." : "",
  };

  const markTouched = (field: string) => setTouched((t) => ({ ...t, [field]: true }));

  useEffect(() => {
    setLoading(true);
    Promise.all([getServiceById(serviceId), getServiceTypes(orgId, { status: "Active" })])
      .then(([svcRes, typesRes]) => {
        const svc = svcRes.data;
        setServiceName(svc.service_name);
        setServiceType(String(svc.service_type));
        setDuration(String(svc.duration));
        setFee(String(svc.fee));
        setStatus(svc.status);
        setServiceTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
      })
      .catch(() => setError("Couldn't load this service."))
      .finally(() => setLoading(false));
  }, [serviceId, orgId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(touchAll(["serviceName", "serviceType", "duration", "fee"]));
    if (!formValid) return;

    setSaving(true);
    setError(null);
    try {
      await updateService(serviceId, {
        service_name: serviceName.trim(),
        service_type: Number(serviceType),
        duration: Number(duration),
        fee,
        status,
      });
      onUpdated();
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Couldn't save changes. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
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
            <ServiceIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.2, fontWeight: 700 }}>
              Edit Service
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Update service details, pricing, or status
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close" sx={{ flexShrink: 0 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Divider />

      {error && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}

      {loading ? (
        <DialogContent sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <CircularProgress size={24} />
        </DialogContent>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 2.5 }}>
            <Stack spacing={2.5}>
              <TextField
                select
                label="Service Category"
                id="serviceType"
                value={serviceType}
                onChange={(e) => {
                  setServiceType(e.target.value);
                  markTouched("serviceType");
                }}
                error={!!errors.serviceType}
                helperText={errors.serviceType}
                fullWidth
              >
                <MenuItem value="">Select a category</MenuItem>
                {serviceTypes.map((t) => (
                  <MenuItem key={t.service_type_id} value={String(t.service_type_id)}>
                    {t.service_type_name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Service Name"
                id="serviceName"
                placeholder="e.g. General Consultation"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                onBlur={() => markTouched("serviceName")}
                error={!!errors.serviceName}
                helperText={errors.serviceName}
                fullWidth
              />

              <TextField
                label="Duration (Minutes)"
                id="duration"
                type="number"
                placeholder="e.g. 20"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                onBlur={() => markTouched("duration")}
                error={!!errors.duration}
                helperText={errors.duration}
                slotProps={{ input: { inputProps: { min: 1 } } }}
                fullWidth
              />

              <TextField
                label="Fee (₹)"
                id="fee"
                type="number"
                placeholder="e.g. 600"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                onBlur={() => markTouched("fee")}
                error={!!errors.fee}
                helperText={errors.fee}
                slotProps={{ input: { inputProps: { min: 0, step: "0.01" } } }}
                fullWidth
              />

              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Status
                </Typography>
                <ToggleButtonGroup
                  value={status}
                  exclusive
                  onChange={(_, value) => value && setStatus(value)}
                  fullWidth
                  size="small"
                >
                  <ToggleButton value="Active" color="success">
                    Active
                  </ToggleButton>
                  <ToggleButton value="Inactive" color="error">
                    Inactive
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button type="submit" variant="contained" disabled={saving || !formValid}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogActions>
        </Box>
      )}
    </Dialog>
  );
};

export default EditService;