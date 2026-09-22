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
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
} from "@mui/material";
import { Close as CloseIcon, Layers as LayersIcon } from "@mui/icons-material";
import { getServiceTypeById, updateServiceType } from "../../../services/catalogService";
import { brandGradient } from "../../../theme/superAdminMuiTheme";
import { validateCategoryName, validateDescription } from "../../../utils/validators";
import { getApiErrorMessage } from "../../../services/api";

type Props = {
  serviceTypeId: number;
  onClose: () => void;
  onUpdated: () => void;
};

const EditServiceType = ({ serviceTypeId, onClose, onUpdated }: Props) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameFieldError = validateCategoryName(name, "Category Name");
  const descriptionError = validateDescription(description, "Description");
  const formValid = !nameFieldError && !descriptionError;
  const nameError = touched.name ? nameFieldError : "";
  const descError = touched.description ? descriptionError : "";
  const markTouched = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
  const touchAll = (fields: string[]) => fields.reduce((acc, field) => ({ ...acc, [field]: true }), {} as Record<string, boolean>);

  useEffect(() => {
    setLoading(true);
    getServiceTypeById(serviceTypeId)
      .then((res) => {
        setName(res.data.service_type_name);
        setDescription(res.data.description || "");
        setStatus(res.data.status);
      })
      .catch(() => setError("Couldn't load this category."))
      .finally(() => setLoading(false));
  }, [serviceTypeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(touchAll(["name", "description"]));
    if (!formValid) return;

    setSaving(true);
    setError(null);
    try {
      await updateServiceType(serviceTypeId, {
        service_type_name: name.trim(),
        description: description.trim(),
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
            <LayersIcon fontSize="small" />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" sx={{ lineHeight: 1.2, fontWeight: 700 }}>
              Edit Category
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Update the category name, description, or status
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
                id="name"
                label="Category Name"
                placeholder="e.g. Cleaning"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => markTouched("name")}
                error={!!nameError}
                helperText={nameError}
                fullWidth
                autoFocus
              />

              <TextField
                id="description"
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => markTouched("description")}
                error={!!descError}
                helperText={descError}
                multiline
                minRows={3}
                fullWidth
                sx={{ "& textarea": { resize: "none" } }}
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

export default EditServiceType;