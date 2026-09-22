import { useState } from "react";
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
} from "@mui/material";
import { Close as CloseIcon, Layers as LayersIcon } from "@mui/icons-material";
import { createServiceType } from "../../../services/catalogService";
import { brandGradient } from "../../../theme/superAdminMuiTheme";
import { validateCategoryName, validateDescription } from "../../../utils/validators";
import { getApiErrorMessage } from "../../../services/api";

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

type TouchedState = {
  [field: string]: boolean;
};

const AddServiceType = ({ onClose, onCreated }: Props) => {
  const orgId = localStorage.getItem("org_id") || undefined;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const status = "Active" as const;
  const [touched, setTouched] = useState<TouchedState>({});
  // Tracks whether the user has actually typed into a field. A field can be
  // "touched" (blurred) without being "dirty" — e.g. the dialog's autoFocus
  // moving focus onto the Name field can trigger a blur on mount/transition
  // before the user has clicked into or typed anything. Gating the error on
  // dirty (or an attempted submit) stops that from surfacing a "required"
  // error the moment the modal opens.
  const [dirty, setDirty] = useState<TouchedState>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameFieldError = validateCategoryName(name, "Category Name");
  const descriptionError = validateDescription(description, "Description");
  const formValid = !nameFieldError && !descriptionError;
  const nameError = (touched.name && dirty.name) || submitAttempted ? nameFieldError : "";
  const descError = (touched.description && dirty.description) || submitAttempted ? descriptionError : "";
  const markTouched = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
  const markDirty = (field: string) => setDirty((d) => ({ ...d, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setTouched((t) => ({ ...t, name: true, description: true }));
    if (!formValid) return;

    setSaving(true);
    setError(null);
    try {
      await createServiceType({
        organization_id: orgId,
        service_type_name: name.trim(),
        description: description.trim(),
        status,
      });
      onCreated();
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, "Couldn't create the category. Please try again."));
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
              New Category
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Group services under a shared category
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
              id="name"
              label="Category Name"
              placeholder="e.g. Account Services"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                markDirty("name");
              }}
              onBlur={() => markTouched("name")}
              error={!!nameError}
              helperText={nameError}
              fullWidth
              autoFocus
            />

            <TextField
              id="description"
              label="Description"
              placeholder="Briefly describe what this category covers..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                markDirty("description");
              }}
              onBlur={() => markTouched("description")}
              error={!!descError}
              helperText={descError}
              multiline
              rows={3}
              fullWidth
              sx={{ "& textarea": { resize: "none" } }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button type="submit" variant="contained" disabled={saving || !formValid}>
            {saving ? "Saving..." : "Save Category"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default AddServiceType;