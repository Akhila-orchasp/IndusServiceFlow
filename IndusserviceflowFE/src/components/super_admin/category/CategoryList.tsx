import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Card,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  alpha,
} from "@mui/material";
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  EditOutlined as EditIcon,
  Close as CloseIcon,
  MonitorHeart as HospitalIcon,
  MedicalServices as ClinicIcon,
  AccountBalance as BankIcon,
  ShoppingBag as RetailIcon,
  SupportAgent as SupportIcon,
  Apps as DefaultIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import AddCategory from "./AddCategory";
import EditCategory from "./EditCategory";
import Toast from "../../common/Toast";
import type { ToastType } from "../../common/Toast";
import { useConfirm } from "../../common/ConfirmDialog";
import ExportMenu from "../../common/ExportMenu";

import { getCategories, updateCategory, exportCategories } from "../../../services/api";

interface Category {
  id: number;
  category_name: string;
  status: string;
  created_by: string;
  created_on: string;
  updated_by: string | null;
  updated_on: string;
  organizations_count?: number;
}

const SUMMARY_COLORS = {
  total: "#0F766E",
  active: "#16A34A",
  inactive: "#DC2626",
};

const CATEGORY_STYLES: {
  keywords: string[];
  color: string;
  icon: ReactNode;
}[] = [
  {
    keywords: ["hospital"],
    color: "#F43F5E",
    icon: <HospitalIcon fontSize="small" />,
  },
  {
    keywords: ["clinic"],
    color: "#14B8A6",
    icon: <ClinicIcon fontSize="small" />,
  },
  {
    keywords: ["retail", "shop", "store"],
    color: "#F59E0B",
    icon: <RetailIcon fontSize="small" />,
  },
  {
    keywords: ["bank", "finance"],
    color: "#6366F1",
    icon: <BankIcon fontSize="small" />,
  },
  {
    keywords: ["support", "customer"],
    color: "#A855F7",
    icon: <SupportIcon fontSize="small" />,
  },
];
const DEFAULT_CATEGORY_COLOR = "#64748B";

const matchCategoryStyle = (name: string) => {
  const lower = name.toLowerCase();
  return CATEGORY_STYLES.find((entry) =>
    entry.keywords.some((keyword) => lower.includes(keyword)),
  );
};

const getCategoryColor = (name: string) =>
  matchCategoryStyle(name)?.color ?? DEFAULT_CATEGORY_COLOR;

const getCategoryIcon = (name: string) =>
  matchCategoryStyle(name)?.icon ?? <DefaultIcon fontSize="small" />;

const CategoryList = () => {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: editingId } = useParams();
  const [searchParams] = useSearchParams();

  const showAddModal = location.pathname === "/super-admin/categories/add";
  const showEditModal = Boolean(editingId);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null,
  );
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);

  const loadCategories = async () => {
    try {
      const response = await getCategories();
      setCategories(response.data ?? []);
    } catch (error) {
      console.error("Unable to load categories", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleToggleStatus = async (
    category: Category,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();

    const isActive = category.status === "Active";
    const newStatus = isActive ? "Inactive" : "Active";

    const confirmed = await confirm({
      title: isActive ? "Inactivate category?" : "Activate category?",
      message: (
        <>
          Do you really want to {isActive ? "inactivate" : "activate"}{" "}
          <strong>"{category.category_name}"</strong>?
        </>
      ),
      variant: isActive ? "danger" : "default",
      confirmText: isActive ? "Inactivate" : "Activate",
    });

    if (!confirmed) return;

    try {
      await updateCategory(category.id, {
        ...category,
        status: newStatus,
      });

      await loadCategories();
    } catch (error) {
      console.error(error);
      setToast({ type: "error", message: "Unable to update category status." });
    }
  };

  const filteredCategories = categories
    .filter((category) =>
      category.category_name.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => a.id - b.id);

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      setExportAnchor(null);

      const params: Record<string, any> = {};
      if (search.trim()) params.search = search.trim();

      const blobData = await exportCategories(format, params);

      const mimeType =
        format === "pdf"
          ? "application/pdf"
          : format === "excel"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv";

      const blob = new Blob([blobData], { type: mimeType });
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `categories.${format === "excel" ? "xlsx" : format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      setToast({
        type: "error",
        message: "Unable to export categories. Check the console for details.",
      });
    }
  };

  const total = categories.length;
  const active = categories.filter((item) => item.status === "Active").length;
  const inactive = categories.filter((item) => item.status === "Inactive").length;

  const summaryTiles = [
    { label: "Total categories", value: total, icon: <DefaultIcon fontSize="small" />, color: SUMMARY_COLORS.total },
    { label: "Active", value: active, icon: <CheckCircleIcon fontSize="small" />, color: SUMMARY_COLORS.active },
    { label: "Inactive", value: inactive, icon: <CancelIcon fontSize="small" />, color: SUMMARY_COLORS.inactive },
  ];

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5 }}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <Dialog
        open={showAddModal}
        onClose={() => navigate("/super-admin/categories")}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <IconButton
          onClick={() => navigate("/super-admin/categories")}
          sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <DialogContent sx={{ p: 0 }}>
          <AddCategory
            onClose={() => navigate("/super-admin/categories")}
            onSuccess={() => {
              navigate("/super-admin/categories");
              loadCategories();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showEditModal}
        onClose={() => navigate("/super-admin/categories")}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <IconButton
          onClick={() => navigate("/super-admin/categories")}
          sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <DialogContent sx={{ p: 0 }}>
          {editingId && (
            <EditCategory
              id={Number(editingId)}
              onClose={() => navigate("/super-admin/categories")}
              onSuccess={() => {
                navigate("/super-admin/categories");
                loadCategories();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
            Categories
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage dynamic organization categories across the platform.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon fontSize="small" />}
          onClick={() => navigate("/super-admin/categories/add")}
        >
          New Category
        </Button>
      </Box>

      {/* Summary */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2.25, mb: 3 }}>
        {summaryTiles.map((tile) => (
          <Card
            key={tile.label}
            elevation={0}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              p: 2.25,
              borderRadius: 3,
              bgcolor: "background.paper",
              boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: alpha(tile.color, 0.12),
                color: tile.color,
                flexShrink: 0,
              }}
            >
              {tile.icon}
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
                {tile.value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {tile.label}
              </Typography>
            </Box>
          </Card>
        ))}
      </Box>
      <Card
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          bgcolor: "background.paper",
          boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, justifyContent: "space-between", mb: 2.5 }}>
          <TextField
            size="small"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: "100%", sm: 320 }, bgcolor: "background.paper" }}
            slotProps={{ input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                </InputAdornment>
              ),
            } }}
          />

          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<DownloadIcon fontSize="small" />}
              onClick={(e) => setExportAnchor(e.currentTarget)}
            >
              Export
            </Button>

            <ExportMenu
              anchorEl={exportAnchor}
              onClose={() => setExportAnchor(null)}
              onExport={handleExport}
            />
          </Box>
        </Box>

        {loading ? (
          <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
            Loading Categories...
          </Typography>
        ) : filteredCategories.length > 0 ? (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(3, 1fr)" }, gap: 2.25 }}>
            {filteredCategories.map((category) => (
              <Card
                key={category.id}
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  position: "relative",
                  transition: "transform .15s ease, box-shadow .15s ease",
                  "&:hover": { transform: "translateY(-2px)", boxShadow: "0 10px 26px rgba(14,60,97,0.14)" },
                }}
              >
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/super-admin/categories/update/${category.id}`);
                  }}
                  sx={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    color: "text.secondary",
                    "&:hover": { color: "primary.main", bgcolor: alpha("#0F766E", 0.08) },
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, pr: 3.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: getCategoryColor(category.category_name),
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {getCategoryIcon(category.category_name)}
                  </Box>
                  <Typography variant="subtitle1" noWrap sx={{ fontWeight: 700 }}>
                    {category.category_name}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
                      {category.organizations_count ?? 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Organizations
                    </Typography>
                  </Box>

                  <Chip
                    label={category.status}
                    size="small"
                    onClick={(e) => handleToggleStatus(category, e as unknown as React.MouseEvent)}
                    color={category.status === "Active" ? "success" : "default"}
                    sx={{ fontWeight: 600, cursor: "pointer" }}
                  />
                </Box>
              </Card>
            ))}
          </Box>
        ) : (
          <Box sx={{ textAlign: "center", py: 8 }}>
            <DefaultIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
              No Categories Yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create your first category to start managing organizations.
            </Typography>
          </Box>
        )}
      </Card>
    </Box>
  );
};

export default CategoryList;