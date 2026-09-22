import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Stack,
  Typography,
  Button,
  Divider,
} from "@mui/material";
import { CategoryOutlined as CategoryIcon, Save as SaveIcon } from "@mui/icons-material";
import { createCategory } from "../../../services/api";
import Toast from "../../common/Toast";
import type { ToastType } from "../../common/Toast";
import { PlainInput, PlainSelect } from "../../common/PlainField";
import { validateCategoryName } from "../../../utils/validators";
import { brandGradient } from "../../../theme/superAdminMuiTheme";

interface AddCategoryProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

const AddCategory = ({ onClose, onSuccess }: AddCategoryProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null,
  );

  const [formData, setFormData] = useState({
    category_name: "",
    status: "Active",
  });

  const [errors, setErrors] = useState({ category_name: "" });
  const [touched, setTouched] = useState<{ category_name?: boolean }>({});
  const [dirty, setDirty] = useState<{ category_name?: boolean }>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === "category_name") {
      setDirty((prev) => ({ ...prev, category_name: true }));
      setErrors((prev) => ({
        ...prev,
        category_name:
          touched.category_name || submitAttempted
            ? validateCategoryName(value, "Category Name")
            : "",
      }));
    }
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "category_name") {
      setTouched((prev) => ({ ...prev, category_name: true }));
      // Only surface the error once the user has actually typed
      // something (or already tried to submit) — a blur that fires
      // without real interaction (e.g. focus moving on dialog open)
      // shouldn't show a "required" error before the user has clicked
      // into the field themselves.
      if (dirty.category_name || submitAttempted) {
        setErrors((prev) => ({
          ...prev,
          category_name: validateCategoryName(value, "Category Name"),
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameError = validateCategoryName(formData.category_name, "Category Name");
    setSubmitAttempted(true);
    setTouched((prev) => ({ ...prev, category_name: true }));
    setErrors((prev) => ({ ...prev, category_name: nameError }));
    if (nameError) {
      return;
    }

    setLoading(true);
    try {
      await createCategory(formData);
      setToast({ type: "success", message: "Category created successfully." });
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          navigate("/super-admin/categories");
        }
      }, 900);
    } catch (error) {
      console.error(error);
      setToast({ type: "error", message: "Unable to create category." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 2,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
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
          <CategoryIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ lineHeight: 1.2, fontWeight: 700 }}>
            Add Category
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Create a new organization category
          </Typography>
        </Box>
      </Box>

      <Divider />

      <Box component="form" onSubmit={handleSubmit} sx={{ px: 3, pt: 2.5, pb: 3 }}>
        <Stack spacing={2}>
          <PlainInput
            label="Category Name"
            name="category_name"
            value={formData.category_name}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="Enter category name"
            required
            error={errors.category_name}
          />

          <PlainSelect
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            options={[
              { value: "Active", label: "Active" },
              { value: "Inactive", label: "Inactive" },
            ]}
          />
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ justifyContent: "flex-end", mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon fontSize="small" />}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Category"}
          </Button>
        </Stack>
      </Box>
    </>
  );
};

export default AddCategory;