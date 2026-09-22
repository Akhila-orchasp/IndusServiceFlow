import React, { useEffect, useState } from "react";
import { Box, Card, Typography, Chip, Button, Divider, alpha } from "@mui/material";
import {
  Bolt as BoltIcon,
  Groups as UsersIcon,
  Business as BuildingIcon,
  AutoAwesome as MagicIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Star as StarIcon,
} from "@mui/icons-material";
import { getPublicPlans } from "../../services/api";
import type { PublicPlan } from "../../types/subscription";

const ICON_COLORS: Record<PublicPlan["icon"], string> = {
  magic: "#A855F7",
  bolt: "#F59E0B",
  users: "#6366F1",
  building: "#0F766E",
};

const planIcon = (icon: PublicPlan["icon"]) => {
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

interface PlanPickerProps {
  selectedPlanId?: number | null;
  onSelect: (plan: PublicPlan) => void;
}
const PlanPicker: React.FC<PlanPickerProps> = ({ selectedPlanId, onSelect }) => {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getPublicPlans();
        if (!cancelled) setPlans(response?.data ?? []);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Failed to load plans. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>
        Loading plans...
      </Typography>
    );
  }

  if (error) {
    return (
      <Typography color="error" sx={{ py: 6, textAlign: "center" }}>
        {error}
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" },
        gap: 1.75,
        alignItems: "stretch",
      }}
    >
      {plans.map((plan) => {
        const isSelected = plan.id === selectedPlanId;
        const iconColor = ICON_COLORS[plan.icon] ?? "#64748B";
        // Defensive coercion: the API is expected to send these as JSON
        // numbers now (see COERCE_DECIMAL_TO_STRING in backend settings),
        // but Number(...) is a harmless no-op on an actual number and
        // protects the `=== 0` / arithmetic below if a decimal ever comes
        // back as a string ("0.00") again from any endpoint.
        const monthlyPrice = Number(plan.monthly_price);
        const annualPrice = Number(plan.annual_price);

        return (
          <Card
            key={plan.id}
            elevation={0}
            variant="outlined"
            sx={{
              position: "relative",
              p: 2,
              pt: plan.badge !== "none" ? 3.75 : 2,
              borderRadius: 2.5,
              display: "flex",
              flexDirection: "column",
              borderColor: isSelected
                ? "primary.main"
                : plan.badge === "popular"
                ? "primary.main"
                : undefined,
              borderWidth: isSelected || plan.badge === "popular" ? 2 : 1,
              boxShadow: isSelected
                ? "0 10px 26px rgba(14,60,97,0.2)"
                : plan.badge === "popular"
                ? "0 10px 26px rgba(14,60,97,0.14)"
                : "none",
              transition: "box-shadow 150ms ease, border-color 150ms ease",
            }}
          >
            {plan.badge === "free_trial" && (
              <Chip
                icon={<MagicIcon sx={{ fontSize: 12 }} />}
                label={`${plan.trial_days ?? 14}-DAY TRIAL`}
                size="small"
                color="secondary"
                sx={{ position: "absolute", top: 10, left: 10, fontWeight: 700, fontSize: 9, height: 20 }}
              />
            )}
            {plan.badge === "popular" && (
              <Chip
                icon={<StarIcon sx={{ fontSize: 12 }} />}
                label="POPULAR"
                size="small"
                color="primary"
                sx={{ position: "absolute", top: 10, left: 10, fontWeight: 700, fontSize: 9, height: 20 }}
              />
            )}

            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: alpha(iconColor, 0.12),
                color: iconColor,
                mb: 1,
                "& svg": { fontSize: 16 },
              }}
            >
              {planIcon(plan.icon)}
            </Box>

            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 14.5 }}>
              {plan.plan_name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.25, minHeight: 30, display: "block", fontSize: 11.5, lineHeight: 1.35 }}>
              {plan.description}
            </Typography>

            <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mb: 0.25 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
                {monthlyPrice === 0 ? "Free" : `₹${monthlyPrice.toLocaleString("en-IN")}`}
              </Typography>
              {monthlyPrice > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10.5 }}>
                  / month
                </Typography>
              )}
            </Box>
            {monthlyPrice > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, fontSize: 10, display: "block" }}>
                or ₹{annualPrice.toLocaleString("en-IN")} billed annually (≈ ₹{Math.round(annualPrice / 12).toLocaleString("en-IN")}/mo)
              </Typography>
            )}
            {plan.trial_available && (
              <Typography variant="caption" color="secondary.dark" sx={{ mb: 0.75, fontWeight: 600, fontSize: 10, display: "block" }}>
                {plan.trial_days ?? 14}-day free trial available
              </Typography>
            )}

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                bgcolor: "background.default",
                borderRadius: 1.5,
                p: 1,
                my: 1.25,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 9.5 }}>
                  Employees
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 12 }}>
                  {plan.employee_limit == null ? "Unlimited" : `Up to ${plan.employee_limit}`}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 9.5 }}>
                  Queues
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600, fontSize: 12 }}>
                  {plan.queue_limit == null ? "Unlimited" : `Up to ${plan.queue_limit}`}
                </Typography>
              </Box>
            </Box>

            <Box
              component="ul"
              sx={{ listStyle: "none", p: 0, m: 0, mb: 1.5, flex: 1, display: "flex", flexDirection: "column" }}
            >
              {plan.features.map((f, idx) => (
                <Box
                  component="li"
                  key={idx}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 0.6,
                    py: 0.15,
                    color: f.included ? "text.primary" : "text.disabled",
                  }}
                >
                  {f.included ? (
                    <CheckIcon sx={{ fontSize: 12, mt: "1px" }} color="success" />
                  ) : (
                    <CloseIcon sx={{ fontSize: 12, mt: "1px", color: "rgba(220,38,38,0.55)" }} />
                  )}
                  <Typography variant="caption" sx={{ fontSize: 10.5, lineHeight: 1.3 }}>
                    {f.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Divider sx={{ mb: 1.25 }} />

            <Button
              fullWidth
              size="small"
              variant={isSelected ? "contained" : "outlined"}
              onClick={() => onSelect(plan)}
              sx={{ fontSize: 12.5, py: 0.6 }}
            >
              {isSelected ? "Selected" : "Select Plan"}
            </Button>
          </Card>
        );
      })}
    </Box>
  );
};

export default PlanPicker;