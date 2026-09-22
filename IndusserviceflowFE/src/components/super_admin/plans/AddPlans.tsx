import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  TextField,
  Checkbox,
  FormControlLabel,
  Alert,
  Divider,
  Button,
  InputAdornment,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

import { createPlan, updatePlan } from "../../../services/api";
import {
  validateBusinessNameField,
  validateDescription,
  validateNonNegativeNumber,
  validateOptionalNonNegativeNumber,
  validatePositiveInteger,
} from "../../../utils/validators";

const FEATURE_CATALOG = [
  "Appointment Booking",
  "Queue Management",
  "Employee Management",
  "Basic Dashboard",
  "Basic Simulation",
  "Basic Reports",
  "Advanced Simulation",
  "Advanced Analytics",
  "Excel Reports",
  "Queue Bottleneck Analysis",
  "Staffing Analysis",
  "Capacity Planning",
  "Unlimited Usage",
];

interface FeatureItem {
  label: string;
  included: boolean;
}

interface EditablePlan {
  id: number;
  plan_name: string;
  description: string;
  monthly_price: number;
  annual_price: number;
  trial_days?: number | null;
  is_popular?: boolean;
  employee_limit: number | null;
  queue_limit: number | null;
  features: FeatureItem[];
}

interface AddPlansProps {
  plan?: EditablePlan | null;
  onClose: () => void;
  onSaved: () => void;
}

const featuresArrayToMap = (features: FeatureItem[] | undefined) => {
  const map: Record<string, boolean> = {};
  (features ?? []).forEach((f) => {
    map[f.label] = f.included;
  });
  return map;
};

const AddPlans: React.FC<AddPlansProps> = ({ plan, onClose, onSaved }) => {
  const isEditMode = !!plan;

  const [planName, setPlanName] = useState(plan?.plan_name ?? "");
  const [isPopular, setIsPopular] = useState(plan?.is_popular ?? false);
  const [tagline, setTagline] = useState(plan?.description ?? "");
  const [monthlyPrice, setMonthlyPrice] = useState(
    plan ? String(plan.monthly_price) : ""
  );
  const [annualPrice, setAnnualPrice] = useState(
    plan ? String(plan.annual_price) : ""
  );
  const [trialDays, setTrialDays] = useState(
    plan?.trial_days != null ? String(plan.trial_days) : ""
  );
  const [maxEmployees, setMaxEmployees] = useState(
    plan?.employee_limit != null ? String(plan.employee_limit) : ""
  );
  const [employeesUnlimited, setEmployeesUnlimited] = useState(
    plan ? plan.employee_limit == null : false
  );
  const [maxQueues, setMaxQueues] = useState(
    plan?.queue_limit != null ? String(plan.queue_limit) : ""
  );
  const [queuesUnlimited, setQueuesUnlimited] = useState(
    plan ? plan.queue_limit == null : false
  );
  const [features, setFeatures] = useState<Record<string, boolean>>(
    featuresArrayToMap(plan?.features)
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState({
    planName: "",
    tagline: "",
    monthlyPrice: "",
    annualPrice: "",
    trialDays: "",
    maxEmployees: "",
    maxQueues: "",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [featuresError, setFeaturesError] = useState("");

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "planName":
        return validateBusinessNameField(value, "Plan name");
      case "tagline":
        return validateDescription(value, "Tagline", 5, 150);
      case "monthlyPrice":
        return validateNonNegativeNumber(value, "Monthly price");
      case "annualPrice":
        return validateNonNegativeNumber(value, "Annual price");
      case "trialDays":
        return validateOptionalNonNegativeNumber(value, "Trial length");
      case "maxEmployees":
        return employeesUnlimited ? "" : validatePositiveInteger(value, "Max employees");
      case "maxQueues":
        return queuesUnlimited ? "" : validatePositiveInteger(value, "Max ongoing queues");
      default:
        return "";
    }
  };

  const handleFieldChange = (name: string, value: string, setter: (v: string) => void) => {
    setter(value);
    setFieldErrors((prev) => ({
      ...prev,
      [name]: touched[name] ? validateField(name, value) : "",
    }));
  };

  const handleFieldBlur = (name: string, value: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    setFieldErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const toggleFeature = (label: string) => {
    setFeatures((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      if (Object.values(next).some(Boolean)) setFeaturesError("");
      return next;
    });
  };

  const handleSave = async () => {
    const fieldsToCheck: Array<[string, string]> = [
      ["planName", planName],
      ["tagline", tagline],
      ["monthlyPrice", monthlyPrice],
      ["annualPrice", annualPrice],
      ["trialDays", trialDays],
      ["maxEmployees", maxEmployees],
      ["maxQueues", maxQueues],
    ];

    const newErrors = { ...fieldErrors };
    let hasError = false;
    fieldsToCheck.forEach(([name, value]) => {
      const message = validateField(name, value);
      (newErrors as any)[name] = message;
      if (message) hasError = true;
    });

    setFieldErrors(newErrors);
    setTouched((prev) => {
      const next = { ...prev };
      fieldsToCheck.forEach(([name]) => {
        next[name] = true;
      });
      return next;
    });

    const noFeatureSelected = !Object.values(features).some(Boolean);
    setFeaturesError(noFeatureSelected ? "Select at least one included feature." : "");
    if (noFeatureSelected) hasError = true;

    if (hasError) {
      setError("Please fix the highlighted fields before saving.");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload = {
        plan_name: planName.trim(),
        description: tagline.trim(),
        monthly_price: Number(monthlyPrice),
        annual_price: Number(annualPrice),
        trial_days: trialDays.trim() === "" ? null : Number(trialDays),
        is_popular: isPopular,
        employee_limit: employeesUnlimited ? null : Number(maxEmployees),
        queue_limit: queuesUnlimited ? null : Number(maxQueues),
        features: FEATURE_CATALOG.map((label) => ({
          label,
          included: !!features[label],
        })),
        status: "Active",
      };

      if (isEditMode && plan) {
        await updatePlan(plan.id, payload);
      } else {
        await createPlan(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to save plan. Please check the fields and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      slotProps={{ paper: { sx: { borderRadius: 3 } } }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 3, pt: 3, pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {isEditMode ? "Edit plan" : "Create new plan"}
        </Typography>
        <IconButton onClick={onClose} aria-label="Close" size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent dividers sx={{ px: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2.5 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", mb: 2.5 }}>
          <TextField
            fullWidth
            required
            label="Plan name"
            placeholder="e.g. Growth"
            value={planName}
            onChange={(e) => handleFieldChange("planName", e.target.value, setPlanName)}
            onBlur={(e) => handleFieldBlur("planName", e.target.value)}
            error={!!fieldErrors.planName}
            helperText={fieldErrors.planName}
          />
        </Box>

        <FormControlLabel
          sx={{ mb: 2 }}
          control={
            <Checkbox checked={isPopular} onChange={(e) => setIsPopular(e.target.checked)} />
          }
          label="Mark as most popular"
        />

        <TextField
          fullWidth
          required
          label="Tagline"
          placeholder="e.g. For busy orgs handling more daily volume"
          value={tagline}
          onChange={(e) => handleFieldChange("tagline", e.target.value, setTagline)}
          onBlur={(e) => handleFieldBlur("tagline", e.target.value)}
          error={!!fieldErrors.tagline}
          helperText={fieldErrors.tagline}
          sx={{ mb: 2.5 }}
        />

        <Box sx={{ display: "flex", gap: 2, mb: 2.5 }}>
          <TextField fullWidth required
             type="number" label="Monthly price" placeholder="5999" value={monthlyPrice} onChange={(e) => handleFieldChange("monthlyPrice", e.target.value, setMonthlyPrice)} onBlur={(e) => handleFieldBlur("monthlyPrice", e.target.value)} error={!!fieldErrors.monthlyPrice} helperText={fieldErrors.monthlyPrice} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0 } }} />
          <TextField fullWidth required
             type="number" label="Annual price" placeholder="57588" value={annualPrice} onChange={(e) => handleFieldChange("annualPrice", e.target.value, setAnnualPrice)} onBlur={(e) => handleFieldBlur("annualPrice", e.target.value)} error={!!fieldErrors.annualPrice} helperText={fieldErrors.annualPrice || "Total amount charged for the year (not a monthly rate)"} slotProps={{ input: { startAdornment: <InputAdornment position="start">₹</InputAdornment> }, htmlInput: { min: 0 } }} />
        </Box>

        <TextField fullWidth
           type="number" label="Trial length (days)" placeholder="e.g. 14 — leave blank for a paid plan" value={trialDays} onChange={(e) => handleFieldChange("trialDays", e.target.value, setTrialDays)} onBlur={(e) => handleFieldBlur("trialDays", e.target.value)} error={!!fieldErrors.trialDays} helperText={
            fieldErrors.trialDays ||
            "Setting this marks the plan as a free trial and shows a trial badge instead of \"Most popular\"."
          } sx={{ mb: 2.5 }} slotProps={{ htmlInput: { min: 1 } }} />

        <Box sx={{ display: "flex", gap: 2, mb: 2.5 }}>
          <Box sx={{ flex: 1 }}>
            <TextField fullWidth required={!employeesUnlimited}
               type="number" label="Max employees" placeholder="60" value={maxEmployees} disabled={employeesUnlimited} onChange={(e) => handleFieldChange("maxEmployees", e.target.value, setMaxEmployees)} onBlur={(e) => handleFieldBlur("maxEmployees", e.target.value)} error={!!fieldErrors.maxEmployees} helperText={fieldErrors.maxEmployees} slotProps={{ htmlInput: { min: 0 } }} />
            <FormControlLabel
              control={
                <Checkbox
                  checked={employeesUnlimited}
                  onChange={(e) => {
                    setEmployeesUnlimited(e.target.checked);
                    setFieldErrors((prev) => ({ ...prev, maxEmployees: "" }));
                  }}
                />
              }
              label="Unlimited"
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <TextField fullWidth required={!queuesUnlimited}
               type="number" label="Max ongoing queues" placeholder="12" value={maxQueues} disabled={queuesUnlimited} onChange={(e) => handleFieldChange("maxQueues", e.target.value, setMaxQueues)} onBlur={(e) => handleFieldBlur("maxQueues", e.target.value)} error={!!fieldErrors.maxQueues} helperText={fieldErrors.maxQueues} slotProps={{ htmlInput: { min: 0 } }} />
            <FormControlLabel
              control={
                <Checkbox
                  checked={queuesUnlimited}
                  onChange={(e) => {
                    setQueuesUnlimited(e.target.checked);
                    setFieldErrors((prev) => ({ ...prev, maxQueues: "" }));
                  }}
                />
              }
              label="Unlimited"
            />
          </Box>
        </Box>

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          What's included *
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 3, rowGap: 0.5 }}>
          {FEATURE_CATALOG.map((label) => (
            <FormControlLabel
              key={label}
              control={
                <Checkbox checked={!!features[label]} onChange={() => toggleFeature(label)} />
              }
              label={<Typography variant="body2">{label}</Typography>}
            />
          ))}
        </Box>
        {featuresError && (
          <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
            {featuresError}
          </Typography>
        )}
      </DialogContent>

      <Divider />
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, p: 2.5 }}>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : isEditMode ? "Save changes" : "Create plan"}
        </Button>
      </Box>
    </Dialog>
  );
};

export default AddPlans;