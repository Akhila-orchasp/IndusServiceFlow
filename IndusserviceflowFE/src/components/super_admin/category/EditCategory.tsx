import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Stack,
  Typography,
  Button,
  Divider,
} from "@mui/material";
import { EditOutlined as EditIcon, Save as SaveIcon } from "@mui/icons-material";
import { getCategoryById, updateCategory } from "../../../services/api";
import Toast from "../../common/Toast";
import type { ToastType } from "../../common/Toast";
import { PlainInput, PlainSelect } from "../../common/PlainField";
import { validateCategoryName } from "../../../utils/validators";
import { brandGradient } from "../../../theme/superAdminMuiTheme";

interface EditCategoryProps {
  id: number;
  onClose?: () => void;
  onSuccess?: () => void;
}

const EditCategory = ({ id, onClose, onSuccess }: EditCategoryProps) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null,
  );

  const [formData, setFormData] = useState({
    category_name: "",
    status: "Active",
  });
  const [originalData, setOriginalData] = useState<Record<string, any> | null>(null);

  const [errors, setErrors] = useState({ category_name: "" });
  const [touched, setTouched] = useState<{ category_name?: boolean }>({});

  useEffect(() => {
    loadCategory();
  }, [id]);

  const loadCategory = async () => {
    setInitializing(true);
    try {
      const raw = await getCategoryById(Number(id));
      const data = (raw as any)?.data ?? raw;
      setOriginalData(data);
      setFormData({
        category_name: data.category_name ?? "",
        status: data.status ?? "Active",
      });
    } catch (error) {
      console.error(error);
    } finally {
      setInitializing(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    if (name === "category_name") {
      setErrors((prev) => ({
        ...prev,
        category_name: touched.category_name
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
      setErrors((prev) => ({
        ...prev,
        category_name: validateCategoryName(value, "Category Name"),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameError = validateCategoryName(formData.category_name, "Category Name");
    setTouched((prev) => ({ ...prev, category_name: true }));
    setErrors((prev) => ({ ...prev, category_name: nameError }));
    if (nameError) {
      return;
    }

    setLoading(true);
    try {
      const payload = { ...(originalData ?? {}), ...formData };
      await updateCategory(Number(id), payload);
      setToast({ type: "success", message: "Category updated successfully." });
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        } else {
          navigate("/super-admin/categories");
        }
      }, 900);
    } catch (error) {
      console.error(error);
      setToast({ type: "error", message: "Unable to update category." });
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
          <EditIcon fontSize="small" />
        </Box>
        <Box>
          <Typography variant="h6" sx={{ lineHeight: 1.2, fontWeight: 700 }}>
            Edit Category
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Update this organization category
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
            disabled={loading || initializing}
          >
            {loading ? "Updating..." : "Update Category"}
          </Button>
        </Stack>
      </Box>
    </>
  );
};

export default EditCategory;