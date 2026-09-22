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
} from "@mui/material";
import { Close as CloseIcon, MiscellaneousServices as ServiceIcon } from "@mui/icons-material";
import { createService, getServiceTypes } from "../../../services/catalogService";
import type { ServiceType } from "../../../services/catalogService";
import { brandGradient } from "../../../theme/superAdminMuiTheme";
import usePlanAccess from "../../../hooks/usePlanAccess";
import { getApiErrorMessage } from "../../../services/api";

type TouchedState = Record<string, boolean>;

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

const isRequired = (value: string) => value.trim() !== "";

const isPositive = (value: string) => {
  const num = Number(value);
  return value.trim() !== "" && Number.isFinite(num) && num > 0;
};

const isNonNegative = (value: string) => {
  const num = Number(value);
  return value.trim() !== "" && Number.isFinite(num) && num >= 0;
};

const AddService = ({ onClose, onCreated }: Props) => {
  const orgId = localStorage.getItem("org_id") || undefined;
  const { canAddService, blockedReason } = usePlanAccess();
  const limitMessage = !canAddService ? blockedReason("queue") : null;

  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [serviceType, setServiceType] = useState<string>("");
  const [duration, setDuration] = useState("");
  const [fee, setFee] = useState("");
  const status = "Active" as const;
  const [touched, setTouched] = useState<TouchedState>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameValid = isRequired(serviceName);
  const typeValid = isRequired(serviceType);
  const durationValid = isPositive(duration);
  const feeValid = isNonNegative(fee);
  const formValid = nameValid && typeValid && durationValid && feeValid;

  const errors: Record<string, string> = {
    serviceName: touched.serviceName && !nameValid ? "Service name is required." : "",
    serviceType: touched.serviceType && !typeValid ? "Please select a service type." : "",
    duration: touched.duration && !durationValid ? "Enter a valid duration in minutes." : "",
    fee: touched.fee && !feeValid ? "Enter a valid fee." : "",
  };

  const markTouched = (field: string) => setTouched((t: TouchedState) => ({ ...t, [field]: true }));

  useEffect(() => {
    getServiceTypes(orgId, { status: "Active" })
      .then((res) => setServiceTypes(Array.isArray(res.data) ? res.data : []))
      .catch(() => setServiceTypes([]));
  }, [orgId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (limitMessage) return;
    setTouched({ serviceName: true, serviceType: true, duration: true, fee: true });
    if (!formValid) return;

    setSaving(true);
    setError(null);
    try {
      await createService({
        organization_id: orgId,
        service_name: serviceName.trim(),
        service_type: Number(serviceType),
        duration: Number(duration),
        fee,
        status,
      });
      onCreated();
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Couldn't create the service. Please try again."));
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
              New Service
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Add a service your customers can book
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

      {limitMessage && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Alert severity="warning">{limitMessage}</Alert>
        </Box>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2.5}>
            <TextField
              select
              label="Service Category"
              id="serviceType"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              onBlur={() => markTouched("serviceType")}
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
              // inputProps sometimes causes TS errors depending on MUI types; ignore for now
              // @ts-ignore
              inputProps={{ min: 1 }}
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
              // @ts-ignore
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button type="submit" variant="contained" disabled={saving || !formValid || !!limitMessage}>
            {saving ? "Saving..." : "Save Service"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default AddService;