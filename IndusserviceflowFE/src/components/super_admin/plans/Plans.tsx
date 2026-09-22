import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  Button,
  ButtonGroup,
  Chip,
  Menu,
  MenuItem,
  IconButton,
  Divider,
  alpha,
} from "@mui/material";
import {
  Bolt as BoltIcon,
  Groups as UsersIcon,
  Business as BuildingIcon,
  AutoAwesome as MagicIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  MoreHoriz as MoreIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Star as StarIcon,
} from "@mui/icons-material";

import { getPlans, createPlan, updatePlan } from "../../../services/api";

import AddPlans from "./AddPlans";
import Toast from "../../common/Toast";
import type { ToastType } from "../../common/Toast";
import { useConfirm } from "../../common/ConfirmDialog";

interface Feature {
  label: string;
  included: boolean;
}

interface Plan {
  id: number;
  plan_name: string;
  description: string;
  status: "Active" | "Inactive";
  badge: "none" | "free_trial" | "popular";
  icon: "magic" | "bolt" | "users" | "building";
  monthly_price: number;
  annual_price: number;
  employee_limit: number | null;
  queue_limit: number | null;
  features: Feature[];
  active_orgs: number;
}

interface PlanStats {
  total_plans: number;
  active_organizations: number;
  most_popular_plan: string;
  on_free_trial: number;
  on_hold: number;
}

type BillingCycle = "monthly" | "annual";

const EMPTY_STATS: PlanStats = {
  total_plans: 0,
  active_organizations: 0,
  most_popular_plan: "-",
  on_free_trial: 0,
  on_hold: 0,
};

const ICON_COLORS: Record<Plan["icon"], string> = {
  magic: "#A855F7",
  bolt: "#F59E0B",
  users: "#6366F1",
  building: "#0F766E",
};

const planIcon = (icon: Plan["icon"]) => {
  switch (icon) {
    case "magic":
      return <MagicIcon fontSize="small" />;
    case "bolt":
      return <BoltIcon fontSize="small" />;
    case "users":
      return <UsersIcon fontSize="small" />;
    case "building":
      return <BuildingIcon fontSize="small" />;
    default:
      return <BoltIcon fontSize="small" />;
  }
};

const PlansPage: React.FC = () => {
  const [stats, setStats] = useState<PlanStats>(EMPTY_STATS);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuPlan, setMenuPlan] = useState<Plan | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const confirm = useConfirm();

  const navigate = useNavigate();
  const location = useLocation();
  const { id: editId } = useParams<{ id?: string }>();

  const showCreateModal = location.pathname === "/super-admin/plans/add";
  const showEditModal = location.pathname.startsWith("/super-admin/plans/edit/");
  const editingPlan = showEditModal
    ? plans.find((p) => p.id === Number(editId)) ?? null
    : null;

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPlans({ status: "all" });

      setStats(response?.stats ?? EMPTY_STATS);
      setPlans(response?.data ?? []);
    } catch (err) {
      console.error(err);
      setError("Failed to load plans. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setMenuPlan(null);
  };

  const handleEditPlan = (plan: Plan) => {
    closeMenu();
    navigate(`/super-admin/plans/edit/${plan.id}`);
  };

  const handleDuplicatePlan = async (plan: Plan) => {
    closeMenu();
    try {
      await createPlan({
        plan_name: `${plan.plan_name} (Copy)`,
        description: plan.description,
        status: "Inactive",
        badge: "none",
        icon: plan.icon,
        monthly_price: plan.monthly_price,
        annual_price: plan.annual_price,
        employee_limit: plan.employee_limit,
        queue_limit: plan.queue_limit,
        features: plan.features,
      });
      setToast({ type: "success", message: `"${plan.plan_name}" duplicated successfully.` });
      fetchPlans();
    } catch (err: any) {
      console.error(err);
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to duplicate plan. Please try again.",
      });
    }
  };

  const handleArchivePlan = async (plan: Plan) => {
    closeMenu();
    const isActive = plan.status === "Active";

    const ok = await confirm({
      title: isActive ? "Archive plan?" : "Activate plan?",
      message: isActive ? (
        <>
          Archive <strong>{plan.plan_name}</strong>? It will be marked Inactive and hidden from
          new sign-ups — existing organizations on it are not affected.
        </>
      ) : (
        <>
          Activate <strong>{plan.plan_name}</strong> again? It will become visible for new
          sign-ups.
        </>
      ),
      variant: isActive ? "danger" : "default",
      confirmText: isActive ? "Archive" : "Activate",
    });
    if (!ok) return;

    const newStatus = isActive ? "Inactive" : "Active";

    try {
      await updatePlan(plan.id, { status: newStatus });
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, status: newStatus } : p))
      );
      setToast({
        type: "success",
        message: `"${plan.plan_name}" ${isActive ? "archived" : "activated"} successfully.`,
      });
    } catch (err: any) {
      console.error(err);
      setToast({
        type: "error",
        message:
          err.response?.data?.message ||
          `Failed to ${isActive ? "archive" : "activate"} plan. Please try again.`,
      });
    }
  };

  const visiblePlans = plans.filter((plan) => {
    if (statusFilter === "active") return plan.status === "Active";
    if (statusFilter === "archived") return plan.status !== "Active";
    return true;
  });

  const statTiles = [
    { label: "Total plans", value: stats.total_plans },
    { label: "Active organizations", value: stats.active_organizations },
    { label: "Most popular", value: stats.most_popular_plan, highlight: true },
    { label: "On free trial", value: stats.on_free_trial },
    { label: "On hold", value: stats.on_hold },
  ];

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5 }}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Header */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
            Subscription plans
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure the plans available to organizations on the platform.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center" }}>
          <ButtonGroup size="small" color="inherit">
            <Button
              variant={billingCycle === "monthly" ? "contained" : "outlined"}
              onClick={() => setBillingCycle("monthly")}
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === "annual" ? "contained" : "outlined"}
              onClick={() => setBillingCycle("annual")}
              endIcon={<Chip label="Save 20%" size="small" color="success" sx={{ height: 18, fontSize: 10, fontWeight: 700 }} />}
            >
              Annual
            </Button>
          </ButtonGroup>

          <Button
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => navigate("/super-admin/plans/add")}
          >
            New plan
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
          Loading plans...
        </Typography>
      ) : error ? (
        <Typography color="error" sx={{ py: 6, textAlign: "center" }}>
          {error}
        </Typography>
      ) : plans.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <BuildingIcon sx={{ fontSize: 48, color: "text.disabled", mb: 1.5 }} />
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
            No plans found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Create your first plan to get started.
          </Typography>
        </Box>
      ) : (
        <>
          {/* Stats strip */}
          <Card
            elevation={0}
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: { xs: 1.5, sm: 3 },
              px: 3,
              py: 2,
              borderRadius: 3,
              mb: 2.5,
              bgcolor: "background.paper",
              boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
            }}
          >
            {statTiles.map((tile, idx) => (
              <React.Fragment key={tile.label}>
                {idx > 0 && <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />}
                <Typography variant="body2" color="text.secondary">
                  {tile.label}{" "}
                  <Typography component="span" color={tile.highlight ? "primary.main" : "text.primary"} sx={{ fontWeight: 700 }}>
                    {tile.value}
                  </Typography>
                </Typography>
              </React.Fragment>
            ))}
          </Card>

          {/* Status filter */}
          <ButtonGroup size="small" color="inherit" sx={{ mb: 3 }}>
            <Button
              variant={statusFilter === "all" ? "contained" : "outlined"}
              onClick={() => setStatusFilter("all")}
            >
              All ({plans.length})
            </Button>
            <Button
              variant={statusFilter === "active" ? "contained" : "outlined"}
              onClick={() => setStatusFilter("active")}
            >
              Active ({plans.filter((p) => p.status === "Active").length})
            </Button>
            <Button
              variant={statusFilter === "archived" ? "contained" : "outlined"}
              onClick={() => setStatusFilter("archived")}
            >
              Archived ({plans.filter((p) => p.status !== "Active").length})
            </Button>
          </ButtonGroup>

          {/* Plan cards */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(3, 1fr)", xl: "repeat(4, 1fr)" }, gap: 2.5, alignItems: "stretch" }}>
            {visiblePlans.map((plan) => {
              const price = billingCycle === "monthly" ? plan.monthly_price : plan.annual_price;
              const isArchived = plan.status !== "Active";
              const iconColor = ICON_COLORS[plan.icon] ?? "#64748B";

              return (
                <Card
                  key={plan.id}
                  elevation={0}
                  variant="outlined"
                  sx={{
                    position: "relative",
                    p: 3,
                    pt: plan.badge !== "none" ? 4.5 : 3,
                    borderRadius: 3,
                    display: "flex",
                    flexDirection: "column",
                    opacity: isArchived ? 0.6 : 1,
                    borderColor: plan.badge === "popular" ? "primary.main" : undefined,
                    borderWidth: plan.badge === "popular" ? 2 : 1,
                    boxShadow: plan.badge === "popular" ? "0 10px 26px rgba(14,60,97,0.14)" : "none",
                  }}
                >
                  {plan.badge === "free_trial" && (
                    <Chip
                      icon={<MagicIcon sx={{ fontSize: 14 }} />}
                      label="14-DAY FREE TRIAL"
                      size="small"
                      color="secondary"
                      sx={{ position: "absolute", top: 12, left: 12, fontWeight: 700, fontSize: 10 }}
                    />
                  )}
                  {plan.badge === "popular" && (
                    <Chip
                      icon={<StarIcon sx={{ fontSize: 14 }} />}
                      label="MOST POPULAR"
                      size="small"
                      color="primary"
                      sx={{ position: "absolute", top: 12, left: 12, fontWeight: 700, fontSize: 10 }}
                    />
                  )}

                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: alpha(iconColor, 0.12),
                        color: iconColor,
                      }}
                    >
                      {planIcon(plan.icon)}
                    </Box>

                    <IconButton
                      size="small"
                      aria-label="Plan options"
                      onClick={(e) => {
                        setMenuAnchor(e.currentTarget);
                        setMenuPlan(plan);
                      }}
                    >
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  </Box>

                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {plan.plan_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                    {plan.description}
                  </Typography>

                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mb: 0.5 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
                      {price === 0 ? "Free" : `₹${price.toLocaleString("en-IN")}`}
                    </Typography>
                    {price > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        / month
                      </Typography>
                    )}
                  </Box>
                  {price === 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                      no payment method required
                    </Typography>
                  )}

                  <Box sx={{ display: "flex", justifyContent: "space-between", bgcolor: "background.default", borderRadius: 2, p: 1.5, my: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        Employees
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {plan.employee_limit == null ? "Unlimited" : `Up to ${plan.employee_limit}`}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                        Ongoing queues
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {plan.queue_limit == null ? "Unlimited" : `Up to ${plan.queue_limit}`}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    component="ul"
                    sx={{
                      listStyle: "none",
                      p: 0,
                      m: 0,
                      mb: 2,
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {plan.features.map((f, idx) => (
                      <Box
                        component="li"
                        key={idx}
                        sx={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 0.75,
                          py: 0.2,
                          color: f.included ? "text.primary" : "text.disabled",
                        }}
                      >
                        {f.included ? (
                          <CheckIcon sx={{ fontSize: 14, mt: "1px" }} color="success" />
                        ) : (
                          <CloseIcon sx={{ fontSize: 14, mt: "1px", color: "rgba(220,38,38,0.55)" }} />
                        )}
                        <Typography variant="caption" sx={{ fontSize: 12, lineHeight: 1.35 }}>
                          {f.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Divider sx={{ mb: 1.5 }} />

                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography variant="caption" color="text.secondary">
                      {plan.active_orgs} active orgs
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<EditIcon fontSize="small" />}
                      onClick={() => navigate(`/super-admin/plans/edit/${plan.id}`)}
                    >
                      Edit
                    </Button>
                  </Box>
                </Card>
              );
            })}
          </Box>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={closeMenu}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: { borderRadius: 2, minWidth: 170, mt: 0.5 } } }}
          >
            <MenuItem onClick={() => menuPlan && handleEditPlan(menuPlan)}>Edit plan</MenuItem>
            <MenuItem onClick={() => menuPlan && handleDuplicatePlan(menuPlan)}>Duplicate</MenuItem>
            <MenuItem onClick={() => menuPlan && handleArchivePlan(menuPlan)}>
              {menuPlan?.status === "Active" ? "Archive plan" : "Activate plan"}
            </MenuItem>
          </Menu>
        </>
      )}

      {showCreateModal && (
        <AddPlans onClose={() => navigate("/super-admin/plans")} onSaved={fetchPlans} />
      )}

      {showEditModal && editingPlan && (
        <AddPlans plan={editingPlan} onClose={() => navigate("/super-admin/plans")} onSaved={fetchPlans} />
      )}
    </Box>
  );
};

export default PlansPage;